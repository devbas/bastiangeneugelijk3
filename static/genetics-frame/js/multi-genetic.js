var dims = ['x', 'y', 'z'] 
var geneLength = 100 
var fittest = 0 
var populationSize = 50
var generationCount = 0 
var geneChoices = [0, 1]

function evolute(population = false, callback) {
  generationCount = generationCount + 1

  if(!population) {
    population = initializePopulation()

    callback(population)
  } else {
    var { fittest, secondFittest } = getFittestParents(population)

    var children = crossover(fittest, secondFittest)

    if(Math.random() % 7 < 0.5) {
      mutateChildren(children.firstChild, children.secondChild, (firstChild, secondChild) => {
        var leastFittestIndex = getLeastFittestIndex(population)
        population[leastFittestIndex] = firstChild.totalFitness > secondChild.totalFitness ? firstChild : secondChild

        callback(population)
      })
    } else {
      // console.log(`Generation ${generationCount} Fittest: ${fittest.totalFitness}`)
      callback(population)
    }
  }
}

function initializePopulation() {
  var population = [] 

  for(var i = 0; i < populationSize; i++) {
    population[i] = initializeIndividual() 
  }

  return population 
}

function initializeIndividual() {
  var individual = {}
  individual.totalFitness = 0 

  for(var i = 0; i < dims.length; i++) {
    individual[dims[i]] = {}

    individual[dims[i]].genes = []
    for(var j = 0; j < geneLength; j++) {
      var random = Math.random() 
      individual[dims[i]].genes[j] = geneChoices[random <= 0.95 ? 0 : 1]
    }
    
    individual[dims[i]].fitness = calcFitness(individual[dims[i]].genes)
    individual.totalFitness += individual[dims[i]].fitness
  }

  return individual 
}

function calcFitness(genes) {
  return genes.reduce((a,b) => a + b, 0)
}

function getFittestParents(population) {
  var maxFit1 = 0
  var maxFit2 = 0
  var fittestIndividual = {}
  var secondFittestIndividual = {}

  for(var i = 0; i < population.length; i++) {
    var totalFitness = 0
    
    for(var j = 0; j < dims.length; j++) {
      var fitness = calcFitness(population[i][dims[j]].genes)
      totalFitness += fitness
    }

    if(totalFitness > maxFit1) {
      maxFit2 = maxFit1
      maxFit1 = totalFitness
      secondFittestIndividual = fittestIndividual
      fittestIndividual = population[i]
    } else if(totalFitness > maxFit2) {
      maxFit2 = totalFitness
      secondFittestIndividual = fittestIndividual
    }
  } 

  return { fittest: fittestIndividual, secondFittest: secondFittestIndividual }
}

function crossover(fittest, secondFittest) {

  var firstChild = fittest
  var secondChild = secondFittest

  for(var i = 0; i < dims.length; i++) {
    var crossoverPoint = getRandomInt(0, 100)
    for(var j = 0; j < crossoverPoint; j++) {
      firstChild[dims[i]].genes[j] = secondFittest[dims[i]].genes[j]
      secondChild[dims[i]].genes[j] = firstChild[dims[i]].genes[j]
    }
  }

  return { firstChild: firstChild, secondChild: secondChild }
}

function getLeastFittestIndex(population) {
  var leastFit = 1000
  var leastFitIndex = 0

  for(var i = 0; i < population.length; i++) {
    var totalFitness = 0
    for(var j = 0; j < dims.length; j++) {
      var fitness = calcFitness(population[i][dims[j]].genes)
      totalFitness += fitness
    }

    if(totalFitness < leastFit) {
      leastFit = totalFitness
      leastFitIndex = i
    }
  }

  return leastFitIndex
}

function mutateChildren(firstChild, secondChild, callback) {
  
  var mutatedFirstChild = {} 
  mutatedFirstChild.totalFitness = 0 

  var mutatedSecondChild = {}
  mutatedSecondChild.totalFitness = 0

  for(var i = 0; i < dims.length; i++) {

    var firstMutationPoint = getRandomInt(0, 100) 
    var secondMutationPoint = getRandomInt(0, 100)

    mutatedFirstChild[dims[i]] = {}
    mutatedFirstChild[dims[i]].genes = Object.assign([], firstChild[dims[i]].genes, 
      {[firstMutationPoint]: firstChild[dims[i]].genes[firstMutationPoint] == 1 ? 0 : 1 })
    
    var firstChildFitness = calcFitness(mutatedFirstChild[dims[i]].genes)
    mutatedFirstChild[dims[i]].fitness = firstChildFitness
    mutatedFirstChild.totalFitness += firstChildFitness


    mutatedSecondChild[dims[i]] = {}
    mutatedSecondChild[dims[i]].genes = Object.assign([], firstChild[dims[i]].genes,
      {[secondMutationPoint]: secondChild[dims[i]].genes[secondMutationPoint] == 1 ? 0 : 1 })

    var secondChildFitness = calcFitness(mutatedSecondChild[dims[i]].genes)
    mutatedSecondChild[dims[i]].fitness = secondChildFitness
    mutatedSecondChild.totalFitness += secondChildFitness
  }

  callback(mutatedFirstChild, mutatedSecondChild)
}