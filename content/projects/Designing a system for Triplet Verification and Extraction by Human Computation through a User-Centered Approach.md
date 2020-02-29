---
title: Designing a system for Triplet Verification and Extraction by Human Computation through a User-Centered Approach.
date: 2018-07-01
draft: false
summary: Semantic Relation Extraction by Human Computation.
type: master-thesis-project
shortTitle: Master Thesis Project
featuredImage: images/triplet-square.svg
project: fu berlin, innovonto
---


Triplets (subject -> predicate/relation -> object) often define a common understanding of the meaning of information. This enables sharing and reuse of data. Triplet extraction by human computation frequently requires domain experts and can be considered a tedious and repetitive task. To overcome these limitations, I developed a game with a purpose to make the task of triplet verification and extraction entertaining.

&nbsp;

Over the recent years, digitization has led to exponential growth of digital information, mostly made available through the world wide web. Digital information is, in the absence of structure, very heterogeneous which hinders the share and reuse of data. Humans can interpret this information, but machines cannot capture the semantics of this heterogeneous information since it is not represented. A common way to represent the semantics of information is by using triplets:

![alt text](/images/triplet-example.svg "Representation of a triplet")

The extraction of triplets from text by human computation often requires domain experts and can be considered a tedious and repetitive task. To extend these limitations, I developed a game with a purpose along with a workflow that supports high-quality triplets. The system is divided into two parts: an Information Extraction (IE) engine and a Human Computing (HC) engine. The IE engine deals with the automatic extraction of nouns, verbs, etc. and automatic triplet extraction. The HC engine was put in place to identify relationships between entities and verify triplets by human computation.

## IE Engine

Once the user has uploaded text to our system, the text is processed by a pipeline of Natural Language Processing (NLP) tools. Our method transforms the text into sentences, each provided with a list of tokens. Each token is tagged with part of speech (POS) and dependencies. Besides, we get the dependencies of tokens within the sentence, to gain insight in the directed links between words so that it can be used to, for example, divide the main clause from a possible sub-clause.

Furthermore, I employed Stanford’s Open Information Extraction (Open IE) system in the pipeline to make sure triplets that can be extracted automatically were obtained. Stanford’s Open IE can extract triplets from plain text so that the schema for these triplets does not need to be declared in advance. The extracted triplets are saved to a triplet store so that they are accessible by the HC engine for verification and ready for export for further usage outside our system.

## HC Engine

The HC engine is responsible for two different tasks, namely, triplet verification and extraction. The extracted relation results in a triplet and is verified based on the sentence wherefrom it is extracted. A decision whether to include a triplet in our IE triplet store is made based on the distribution of votes and majority voting. Triplet extraction is done by selecting a subject, predicate and object from a presented sentence.
