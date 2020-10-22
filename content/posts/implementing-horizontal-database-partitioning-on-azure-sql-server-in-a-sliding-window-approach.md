---
title: Implementing horizontal database partitioning on Azure SQL Server in a Sliding Window approach.
date: 2019-12-20
draft: false
summary: Dynamic Azure SQL Server partitioning can be tedious to setup:\ how to setup a sliding window partitioning approach? What about changing needs with regards to partition expiration periods? This article provides a reproducible script for dynamic table partitioning on Azure SQL Server.
---

Interaction with a subset of data on an Azure SQL Server database with very large tables can be very resource consuming. Luckily, SQL offers partitioning to deal with this exact problem and optimise the following processes:

- Maintenance operations (e.g., alterations of data, row-based operations)
- Deletion of records
- Query execution
- Access/transfer subsets of data

Partitioning is a database process where very large tables are divided into multiple smaller parts. By splitting tables into smaller, individual tables, queries that access only a fraction of the data can run faster because there is less data to scan.

There are two types of partitioning: vertical and horizontal partitioning. Vertical partitioning partitions columns into multiple tables, whereas horizontal partitioning partitions rows into multiple tables. In this article we focus on horizontal partitioning. An overview of the implemented solution can be found below:

![alt text](/images/partitioning-initial.svg "Sliding Window SQL Partitioning")

&nbsp;

## Initial setup

In this article we start from the ground up with the goal of describing a reproducible process. First, we generate a database with some tables and dummy data:

```sql
-- 1. Create a sample database and tables
CREATE DATABASE TestDB;
USE TestDB;

CREATE SCHEMA source;

CREATE TABLE source.EmployeeReports
(
  ReportID int IDENTITY (1,1) NOT NULL,
  ReportName varchar (100),
  ReportNumber varchar (20),
  ReportDescription varchar (max),
  ReportDate bigint
  CONSTRAINT EReport_PK PRIMARY KEY CLUSTERED (ReportID)
);

CREATE NONCLUSTERED INDEX "ReportID_Index" ON source.EmployeeReports ( ReportID ASC )

-- 2. Fill up the database with sample data
DECLARE @i int
SET @i = 1
  
BEGIN TRAN
  WHILE @i < 100000
    BEGIN
      INSERT INTO source.EmployeeReports
        (ReportName, ReportNumber, ReportDescription, ReportDate)
      VALUES ('ReportName', CONVERT (varchar (20), @i), REPLICATE ('Report', 1000),
              CAST(RAND(CHECKSUM(NEWID()))*94694400000 as bigint) + 1509459148000)

      SET @i=@i+1
    END

COMMIT TRAN;
```

### Partitioning Function 
A partitioning function maps the rows of a table or index into partitions based on the values of the specified column. In our example, *ReportDate* is defined as the partitioning column. Since we apply partitioning to an existing table, we build the partitioning function dynamically:

```sql 
-- The Partitioning function is build from the minimal timestamp 
-- present to a given reference date.

DECLARE @DatePartitionFunction nvarchar(max) = 
  N'CREATE PARTITION FUNCTION ReportsRetentionFunction (BIGINT)
  AS RANGE LEFT FOR VALUES('

DECLARE @ReferenceDate AS BIGINT
DECLARE @ReferenceBoundary AS BIGINT
DECLARE @NextBoundary AS BIGINT
DECLARE @PartitionWindow AS BIGINT
DECLARE @OldestBoundary AS BIGINT

-- Use modulo to get the start of day for the minimum ReportDate.
SELECT @OldestBoundary = ((MIN(ReportDate) - (MIN(ReportDate) % (3600000 * 24))) + 3600000 * 24)
FROM source.EmployeeReports

SET @NextBoundary = OldestBoundary

-- Set a Partition Window equivalent to 24 hours. This
SET @PartitionWindow = 86400000

SELECT @ReferenceDate = DATE(SECOND,'1970-01-01', GETUTCDATE())
SELECT @ReferenceBoundary = ((@ReferenceDate - @ReferenceDate % (3600 * 24)) + 3600 * 24) * 1000

WHILE @NextBoundary <= @ReferenceBoundary
  BEGIN
    IF (@NextBoundary = @ReferenceBoundary) SET @DatePartitionFunction += CAST(@NextBoundary AS NVARCHAR) + N''
    IF (@NextBoundary < @ReferenceBoundary) SET @DatePartitionFunction += CAST(@NextBoundary AS NVARCHAR) + N', '

    SET @NextBoundary = @NextBoundary + @PartitionWindow
  END
SET @DatePartitionFunction += ');'

EXEC sp_executesql @DatePartitionFunction
```

### Partitioning Scheme

A partitioning scheme can be viewed as a connection between a Partition Function and Filegroups. In the scope of this article, default SQL Server behaviour regarding Filegroups is implemented: every partition gets mapped to the Primary Filegroup:

```sql
CREATE PARTITION SCHEME ReportsRetentionScheme
AS PARTITION ReportsRetentionFunction ALL TO ([PRIMARY]);
```

### Create Partitioned Tables

To have partitioned tables, we create new tables that mirror the structure of the existing tables. The new tables are mapped to the ReportsRetentionScheme and the partition function column is passed along (ReportDate).
Besides, we add the partition function column (ReportDate) to the Primary key. To accomplish this, we end up with the following statement:

```sql
CREATE TABLE source.PartitionEmployeeReports (
  ReportID int IDENTITY (1,1) NOT NULL,
  ReportName varchar (100),
  ReportNumber varchar (20),
  ReportDescription varchar (max),
  ReportDate bigint
  CONSTRAINT P_EReport_PK PRIMARY KEY CLUSTERED (ReportDate, ReportID)
)
ON ReportsRetentionScheme(ReportDate);
```

### Partitioned indexes

During the setup of our demo table, we created an index. Now that our table is partitioned, SQL Server requires indexes to be partitioned as well. The index below will be partitioned since it is mapped on the *[ReportsRetentionScheme]*.

```sql
CREATE NONCLUSTERED INDEX "ReportID_Index" ON source.PartitionEmployeeReports ( ReportID ASC )
ON [ReportsRetentionScheme]([ReportDate])
```

### Transfer data from unpartitioned table to partitioned table

Once the partitioned tables are created, we copy the data from the unpartitioned tables into the partitioned tables. SQL Server uses the partition function column (ReportDate) to assess in which partition a record will be placed.

```sql
SET IDENTITY_INSERT source.PartitionEmployeeReports ON -- We use this to maintain assigned identities.
INSERT INTO source.PartitionEmployeeReports (ReportID, ReportName, ReportNumber, ReportDescription, ReportDate)
SELECT ReportID, ReportName, ReportNumber, ReportDescription, ReportDate
FROM source.EmployeeReports;
```

### Rename partitioned table

After the data has been inserted into the partitioned table, the unpartitioned table gets renamed and the partitioned table becomes the new standard:

```sql
EXEC sp_rename 'source.EmployeeReports', 'OldEmployeeReports';
EXEC sp_rename 'source.PartitionEmployeeReports', 'EmployeeReports';
```

&nbsp;

## Sliding Window implementation

To implement a sliding window approach, we write a stored procedure that runs periodically, let's say every night. To phase out old partitions, we have to adhere to a specific SQL Server mechanism:

![alt text](/images/partitioning-target-tables.svg "SQL Phasing out partitions")

As can be seen in the figure above, to phase out partitions on SQL Server, source and target tables are needed. Source tables are the original partitioned tables, that hold all the data.
Target tables are only being used to phase out partitions. Target tables mirror the exact same structure as the source tables.
In our case, source tables are placed on the 'source' schema, whereas target tables are placed on the 'target' schema. To create target tables, we recreate the source tables on the 'target' schema:

```sql
CREATE SCHEMA target;

CREATE TABLE target.EmployeeReports (
  ReportID int IDENTITY (1,1) NOT NULL,
  ReportName varchar (100),
  ReportNumber varchar (20),
  ReportDescription varchar (max),
  ReportDate bigint
  CONSTRAINT P_EReport_PK PRIMARY KEY CLUSTERED (ReportDate, ReportID)
)
ON ReportsRetentionScheme(ReportDate);

CREATE NONCLUSTERED INDEX "ReportID_Index" ON target.EmployeeReports ( ReportID ASC )
ON [ReportsRetentionScheme]([ReportDate])
```

Note: Since the target table needs to mirror the specific source table structure, we also have to recreate the indexes.

### Stored procedure

To check for partitions to phase out and create new partitions, logic is needed. In our case, a stored procedure checks every night for partitions that are older than a defined period of time. Besides, it creates new partitions when necessary:

```sql
IF EXISTS(SELECT Name FROM sys.procedures WHERE name='SlidePartitions')

DROP PROCEDURE source.SlidePartitions
GO

CREATE PROCEDURE source.SlidePartitions
  @RetentionPeriod BIGINT,
  @ReferenceDate BIGINT,
  @PartitionWindow BIGINT,
  @PartitionBuffer INT
AS
BEGIN

  DECLARE @ExpiredPartitionId AS BIGINT
  DECLARE @ExpiredPartitionBoundary AS BIGINT
  DECLARE @NewestBoundary AS BIGINT
  DECLARE @NextBoundary AS BIGINT


  -- Get the maximum declared boundary (Unix timestamp) for ReportsRetentionFunction.
  SELECT @NewestBoundary = CONVERT(BIGINT, MAX(value))
    FROM sys.partitions p
    INNER JOIN sys.sysobjects tab
    ON tab.id = p.object_id
    INNER JOIN sys.partition_range_values prv
    ON prv.boundary_id = p.partition_number
    INNER JOIN sys.partition_functions pf
    ON pf.function_id = prv.function_id
    WHERE pf.name = 'ReportsRetentionFunction'

    SET @NextBoundary = @NewestBoundary + @PartitionWindow

  -- Create new partition boundaries as long as the conditions below are not met.
  WHILE @NewestBoundary < (@ReferenceDate + (@PartitionWindow * @PartitionBuffer))
  BEGIN

    -- Specify which Filegroup will be used for the next partition.
    ALTER PARTITION SCHEME ReportsRetentionScheme NEXT USED [PRIMARY]

    -- Extend the partition function with a defined boundary.
    ALTER PARTITION FUNCTION ReportsRetentionFunction() SPLIT RANGE(@NextBoundary)

    SET @NewestBoundary = @NextBoundary
    SET @NextBoundary = @NewestBoundary + @PartitionWindow
  END

  -- Iterate while partitions exist with a boundary smaller than (older than) @ReferenceDate - @RetentionPeriod
  WHILE(SELECT COUNT(*) FROM sys.partitions p
      INNER JOIN sys.objects tab ON tab.object_id = p.object_id
      INNER JOIN sys.partition_range_values prv ON prv.boundary_id = p.partition_number
      INNER JOIN sys.partition_functions pf ON pf.function_id = prv.function_id
      INNER JOIN sys.schemas sch ON sch.schema_id = tab.schema_id
      WHERE pf.name = 'ReportsRetentionFunction'
      AND sch.name = 'source'
      AND value < @ReferenceDate - @RetentionPeriod
      AND tab.name IN ('EmployeeReports')
    ) > 0
    BEGIN

    -- Find the first expired partition
    SELECT DISTINCT TOP 1 @ExpiredPartitionId = CONVERT(NVARCHAR, partition_number),
      @ExpiredPartitionBoundary = CONVERT(NVARCHAR, value)
    FROM sys.partitions p
    INNER JOIN sys.objects tab ON tab.object_id = p.object_id
    INNER JOIN sys.partition_range_values prv ON prv.boundary_id = p.partition_number
    INNER JOIN sys.partition_functions pf ON pf.function_id = prv.function_id
    INNER JOIN sys.schemas sch ON sch.schema_id = tab.schema_id
    WHERE pf.name = 'ReportsRetentionFunction'
    AND sch.name = 'source'
    AND value < @ReferenceDate - @RetentionPeriod
    AND tab.name IN ('EmployeeReports')

    -- Move all data from all partitioned tables with @ExpiredPartitionId to the respective target tables.
    DECLARE @Alter_EmployeeReports NVARCHAR(500)
    DECLARE @ParameterDefinition NVARCHAR(4000)


    SET @Alter_EmployeeReports = N'ALTER TABLE source.EmployeeReports
      SWITCH PARTITION @ExpiredPartitionId
      TO target.EmployeeReports
      PARTITION @ExpiredPartitionId'

    SET @ParameterDefinition = N'@ExpiredPartitionId BIGINT'

    EXECUTE sp_executesql @Alter_EmployeeReports, @ParameterDefinition,
      @ExpiredPartitionId = @ExpiredPartitionId

    TRUNCATE TABLE target.EmployeeReports


    -- At this stage, the data is removed from the partition but the partition itself still exists.
    -- For that, the partition is merged back into the existing boundaries of the ReportsRetentionFunction.

    -- Specify the Filegroup that will be used for the expired partition to be merged
    ALTER PARTITION SCHEME ReportsRetentionScheme NEXT USED [PRIMARY]

    -- Merge the expired partition into the defined ReportsRetentionFunction boundaries. This removes the expired partition.
    ALTER PARTITION FUNCTION ReportsRetentionFunction() MERGE RANGE (@ExpiredPartitionBoundary)

  END

END;
GO
```

### Run Stored Procedure

Once the stored procedure is saved on the SQL Server, we can trigger the stored procedure with the following SQL statement:

```sql
DECLARE @RetentionPeriod AS BIGINT
DECLARE @ReferenceDate AS BIGINT
DECLARE @PartitionWindow AS BIGINT
DECLARE @PartitionBuffer AS INT

-- Equivalent of 60 days
SET @RetentionPeriod = CAST(60 * 60 * 24 * 60 AS BIGINT) * 1000

-- Equivalent of current UNIX timestamp
SET @ReferenceDate = CAST(DATEDIFF(SECOND, '1970-01-01', GETUTCDATE()) AS BIGINT) * 1000

SET @PartitionWindow = 1000 * 60 * 60 * 24 -- 24 hours in milliseconds
SET @PartitionBuffer = 10

EXEC source.SlidePartitions
  @RetentionPeriod = @RetentionPeriod,
  @ReferenceDate = @ReferenceDate,
  @PartitionWindow = @PartitionWindow,
  @PartitionBuffer = @PartitionBuffer
```

That's it! In case of any questions drop me an email or reach out to me on Twitter.
