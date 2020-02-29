---
title: ContentTagger - An easy way to provide structured data to your website. 
date: 2017-08-01
draft: false
summary: ContentTagger makes it easy to provide structured data to your website.
shortTitle: ContentTagger
featuredImage: images/contenttagger-logo.svg
project: self-initiated
---



### 🤔 Problem

I work a lot with SEO and lately I got frustrated because of all the different formats that are required to support rich data snippets for Google, Facebook etcetera. But then I came across a TED talk about linked data:

{{< youtube OM6XIICm_qo >}}

This was exactly what I wanted. But the right tags with domain classes etcetera where kinda hard to structure. So here comes the solution.

### 🛠 Solution

ContentTagger automatically shows you the 'child' attributes from a chosen domain or range attribute so it becomes more easy to select something. On top of that I'm able to pass a link with the code to Google Structured Data Developer console and Facebook Graph, so easy testing! In the future I want to add more schemas (currently only schema.org) and create a library which you can use to query linked data yourself with SparQL.

![alt text](/images/selection-mechanism.jpeg "Labeling starts with the most abstract objects.")
*Labeling starts with the most abstract objects.*

&nbsp;

![alt text](/images/parent-selection.jpeg "ContentTagger takes parent-attribute objects into account when showing available objects.")
ContentTagger takes parent-attribute objects into account when showing available objects.
