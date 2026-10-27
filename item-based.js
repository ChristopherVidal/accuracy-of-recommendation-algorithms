import {open} from 'fs/promises';

class MaxHeap {
  constructor() {
    this.heap = [];
  }

  numOfElements() {
    return this.heap.length
  }

  push(val) {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return max;
  }

  bubbleUp(index) {
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].score <= this.heap[parentIndex].score) break;
      
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let largest = index;

      if (left < this.heap.length && this.heap[left].score > this.heap[largest].score) {
        largest = left;
      }
      if (right < this.heap.length && this.heap[right].score > this.heap[largest].score) {
        largest = right;
      }

      if (largest === index) break;

      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

async function leaveOneOut(neighbourhoodSize, threshold){
  
  console.time("Execution Time")
  
  // let fileName = './test3.txt'
  let fileName = './assignment2-data.txt'
  let simMatrix = []
  let ratingsMatrix = []
  let usersInCommonMatrix = []
  let usersMap = new Map()
  let simHeapMap = new Map()
  let itemsMap = new Map()
  let items = []
  let numOfUsers = 0
  let numOfItems = 0  
  let firstFewLines = 0
  let nextUser = 0
  let ratedItems = []
  let mae = 0
  
  const file = await open(fileName);

  for await (const line of file.readLines()) {
    switch (firstFewLines) {
      case 0:
        let numbers = line.split(' ')
        numOfUsers = Number(numbers[0])
        numOfItems = Number(numbers[1])
        simMatrix = new Array(numOfItems)
        usersInCommonMatrix = new Array(numOfItems)
        
        for (let i = 0; i < numOfItems; i++) {
            let maxHeap = new MaxHeap()
            simHeapMap.set(i, maxHeap)
            
            let rowForSimMatrix = new Array(numOfItems)
            let rowForUsersInCommonMatrix = new Array(numOfItems)
            for (let j = 0; j < numOfItems; j++) {
                rowForSimMatrix[j] = 0.0
                rowForUsersInCommonMatrix[j] = []
            }
            simMatrix[i] = rowForSimMatrix
            usersInCommonMatrix[i] = rowForUsersInCommonMatrix
        }

        ratingsMatrix = new Array (numOfUsers)
        for (let i = 0; i < numOfUsers; i++) {
          let row = new Array(numOfItems)
          for(let j = 0; j < numOfItems; j++) {
            row[j] = {score: 0.0, source: "truth"}
          }
          ratingsMatrix[i] = row
        }
        
        firstFewLines += 1
        break;
      case 1:
        let names = line.split(' ')
        for (let i = 0; i < numOfUsers; i++) {
          let userObject = {}
          //the average rating when a rating has been taken away from a user
          userObject.tempAvgRating = 0
          //indices (0-164) of users that have >= 1 rated product in common with this user 
          userObject.usersWithCommonRatedItems = []
          //the actual average rating from the dataset
          userObject.avgRating = 0
          
          userObject.name = names[i]
          userObject.ratedItems = new Set()
          usersMap.set(i, userObject)
        }
        firstFewLines += 1
        break;
      case 2:
        let itemNames = line.split(' ')
        for (let i = 0; i < itemNames.length; i++) {
            let itemObject = {}
            itemObject.name = itemNames[i]
            itemObject.ratingUsers = new Set()
            itemObject.itemsWithCommonRatingUsers = []
            itemsMap.set(i, itemObject)
            items.push(itemNames[i])

        }
        firstFewLines += 1

        continue;
    }

    if(firstFewLines > 2){
      let inputRatings = line.split(' ')
      let userObj = usersMap.get(nextUser)
      let runningAverageSum = 0.0
      let numberOfActuallyRatedItems = 0.0
      for (let p = 0; p < numOfItems; p++) {
        let ratingMatrixEntryObj = ratingsMatrix[nextUser][p]

        ratingMatrixEntryObj.score = Number(inputRatings[p])
        if(Number(inputRatings[p]) == 0){
            ratingMatrixEntryObj.source = "guess"

        }else{
            let thisItem = itemsMap.get(p)
            thisItem.ratingUsers.add(nextUser)
            itemsMap.set(p, thisItem)

            runningAverageSum += Number(inputRatings[p])
            numberOfActuallyRatedItems += 1.0
            userObj.ratedItems.add(p)

            let ratedItem = {}
            ratedItem.user = nextUser
            ratedItem.item = p
            ratedItems.push(ratedItem)
        }
        ratingsMatrix[nextUser][p] = ratingMatrixEntryObj
        }
      //calculate average rating
      userObj.sumOfScores = runningAverageSum
      userObj.avgRating = runningAverageSum / numberOfActuallyRatedItems
      usersMap.set(nextUser, userObj)
      
      nextUser += 1
    }

  }

  let jOffset = 1
  let j = jOffset
  //see what rated items every user pair has in common
  for (let i = 0; i < numOfItems-1; i++) {
    for (; j < numOfItems; j++) {
      //choose the rating users set of the item with the fewest amount of users reviewing it
      let smallestRatingUsersSet = new Set()
      let itemWithMoreReviewers = -1

      if(itemsMap.get(i).ratingUsers.size < itemsMap.get(j).ratingUsers.size){
        smallestRatingUsersSet = itemsMap.get(i).ratingUsers
        itemWithMoreReviewers = j
      } else {
        smallestRatingUsersSet = itemsMap.get(j).ratingUsers
        itemWithMoreReviewers = i
      }
      
      const iterator = smallestRatingUsersSet.entries()
      
      let ratingUserInCommon = false
      for (const entry of iterator){
        if (itemsMap.get(itemWithMoreReviewers).ratingUsers.has(entry[0])) {
          if(!ratingUserInCommon){
            itemsMap.get(i).itemsWithCommonRatingUsers.push(j)
            itemsMap.get(j).itemsWithCommonRatingUsers.push(i)
            ratingUserInCommon = true
          }
          usersInCommonMatrix[i][j].push(entry[0])
          usersInCommonMatrix[j][i].push(entry[0])
        }
      }

    }
    jOffset += 1
    j = jOffset
  }

  //now, we work our way through all tests 
  for (let i = 0; i < ratedItems.length; i++){
    //Working with a single user/item combo at a time
    let ratedItem = ratedItems[i]

    let userIndex = ratedItem.user
    let itemIndex = ratedItem.item

    
    let user = usersMap.get(userIndex)
    let item = itemsMap.get(itemIndex)
    let originalRating = ratingsMatrix[userIndex][itemIndex].score
    let predictedRating = -1

    //Recompute user average with this rating gone
    if(user.ratedItems.size-1 == 0){
        user.tempAvgRating = 0
    }else{
        user.tempAvgRating = (user.sumOfScores-originalRating) / (user.ratedItems.size-1)
    }

    for (let j = 0; j < item.itemsWithCommonRatingUsers.length; j++) {

        let otherItemIndex = item.itemsWithCommonRatingUsers[j];

        //This won't be a usable neighbour for the prediction later on if there's no rating
        if(ratingsMatrix[userIndex][otherItemIndex].score === 0){
          continue
        }

        let commonRatingUsers = usersInCommonMatrix[itemIndex][otherItemIndex]
        //find out what they each have in common
        //loop through this new set
        let numerator = 0.0
        let denomA = 0.0
        let denomB = 0.0
        let denom = 0.0
        
        let similarityScore = 0.0
        
        for (let k = 0; k < commonRatingUsers.length; k++) {
          let commonUser = commonRatingUsers[k]

          if(commonUser === userIndex){
            continue
          }

          numerator += (ratingsMatrix[commonUser][itemIndex].score - usersMap.get(commonUser).avgRating) * (ratingsMatrix[commonUser][otherItemIndex].score - usersMap.get(commonUser).avgRating)
          denomA += (ratingsMatrix[commonUser][itemIndex].score - usersMap.get(commonUser).avgRating) ** 2
          denomB += (ratingsMatrix[commonUser][otherItemIndex].score - usersMap.get(commonUser).avgRating) ** 2
        }

        denom = Math.sqrt(denomA) * Math.sqrt(denomB)

        if(denom !== 0){
            similarityScore = numerator / denom
        }else{
            similarityScore = 0
        }

        if(similarityScore > threshold){
          simHeapMap.get(itemIndex).push(
              {
                  itemIndex: otherItemIndex, 
                  score: similarityScore
              })
        }
    }

    //similarity scores have been computed, now calculate the rating prediction

    //if there are no suitable neighbours, the rating prediction is the user's average rating discounting
    //the actual rating given to the item itemIndex
    if(simHeapMap.get(itemIndex).numOfElements() === 0){
        predictedRating = user.tempAvgRating
        
    }else{
        let numOfNeighboursToUse = 0
        simHeapMap.get(itemIndex).numOfElements() >= neighbourhoodSize ? numOfNeighboursToUse = neighbourhoodSize : numOfNeighboursToUse = simHeapMap.get(itemIndex).numOfElements()
        let denom = 0.0
        let numerator = 0.0
        for (let p = 0; p < numOfNeighboursToUse; p++) {
          let similarItem = simHeapMap.get(itemIndex).pop()

          denom += similarItem.score
          numerator += similarItem.score * ratingsMatrix[userIndex][similarItem.itemIndex].score
          
        }
        if(denom == 0){
          predictedRating = user.tempAvgRating
        } else {
          predictedRating = (numerator/denom)
          if(!predictedRating){
            console.log("denom", denom)
            console.log("numerator", numerator)
            console.log(predictedRating)
          }
        }

        if(predictedRating < 1.0){
          predictedRating = 1.0
        } else if (predictedRating > 5.0) {
          predictedRating = 5.0
        }
    
    }
    mae += Math.abs(originalRating - predictedRating)
    
    let maxHeap = new MaxHeap()
    simHeapMap.set(itemIndex, maxHeap)
  }
  //compute the MAE
  mae = mae / ratedItems.length
  
  console.timeEnd("Execution Time")
  console.log(mae)
}

//Uncomment function call below, varying neighbourhood size and threshold.

//leaveOneOut(4422, 0)
