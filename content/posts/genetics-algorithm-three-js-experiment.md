---
title: Genetics Algorithm + Three.js Experiment
date: 2019-12-21
draft: false
summary: I've had some fun playing around with the Genetics algorithm, the fittest nodes of a population evolve with a chance of random mutation, while the unfittest nodes are eliminated.
type: genetics-algorithm-three-js-experiment
---

I've had some fun playing around with the Genetics algorithm: the fittest nodes of a population evolve with a chance of random mutation, while the unfittest nodes are eliminated.
The fitness function for the visualisation below is to maximise the sum of values for all nodes.
Each node evolutes in three dimensions: `x,y,z`, with each dimension having 100 genes.
A gene can be either 0 or 1. Therefore, the maximum fitness a node can have is 300.

*(It can take a while before the visualisation is loaded)*