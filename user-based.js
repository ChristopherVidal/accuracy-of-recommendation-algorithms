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
  
  let fileName = './assignment2-data.txt'
  let simMatrix = []
  let ratingsMatrix = []
  let ratedItemsInCommonMatrix = []
  let usersMap = new Map()
  let simHeapMap = new Map()
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
        simMatrix = new Array(numOfUsers)
        ratedItemsInCommonMatrix = new Array(numOfUsers)
        for (let i = 0; i < numOfUsers; i++) {

          let maxHeap = new MaxHeap()
          simHeapMap.set(i, maxHeap)

          let rowForSimMatrix = new Array(numOfUsers)
          let rowForItemsInCommonMatrix = new Array(numOfUsers)
          for (let j = 0; j < numOfUsers; j++) {
            rowForSimMatrix[j] = 0.0
            rowForItemsInCommonMatrix[j] = []
          }          
          simMatrix[i] = rowForSimMatrix
          ratedItemsInCommonMatrix[i] = rowForItemsInCommonMatrix
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
          //the actual average rating
          userObject.avgRating = 0
          
          userObject.name = names[i]
          userObject.similarUsers = []
          userObject.ratedItems = new Set()
          usersMap.set(i, userObject)
        }
        firstFewLines += 1
        break;
      case 2:
        let itemNames = line.split(' ')
        for (let i = 0; i < itemNames.length; i++) {
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
  for (let i = 0; i < numOfUsers-1; i++) {
    for (; j < numOfUsers; j++) {
      //choose the rated product set of the user with the fewest amount of products of reviewed
      let smallestRatedProducts = new Set()
      let userWithMoreReviews = -1

      if(usersMap.get(i).ratedItems.size < usersMap.get(j).ratedItems.size){
        smallestRatedProducts = usersMap.get(i).ratedItems
        userWithMoreReviews = j
      } else {
        smallestRatedProducts = usersMap.get(j).ratedItems
        userWithMoreReviews = i
      }
      
      const iterator = smallestRatedProducts.entries()
      
      let ratedItemInCommon = false
      for (const entry of iterator){
        if (usersMap.get(userWithMoreReviews).ratedItems.has(entry[0])) {
          if(!ratedItemInCommon){
            usersMap.get(i).usersWithCommonRatedItems.push(j)
            usersMap.get(j).usersWithCommonRatedItems.push(i)
            ratedItemInCommon = true
          }
          ratedItemsInCommonMatrix[i][j].push(entry[0])
          ratedItemsInCommonMatrix[j][i].push(entry[0])
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
    let originalRating = ratingsMatrix[userIndex][itemIndex].score
    let predictedRating = -1

    //Recompute user average with this rating gone
    if(user.ratedItems.size-1 == 0){
        user.tempAvgRating = 0
    }else{
        user.tempAvgRating = (user.sumOfScores-originalRating) / (user.ratedItems.size-1)
    }

    for (let j = 0; j < user.usersWithCommonRatedItems.length; j++) {

        let otherUserIndex = user.usersWithCommonRatedItems[j];

        //This won't be a usable neighbour for the prediction later on if they have not rated this item either.
        if(ratingsMatrix[otherUserIndex][itemIndex].score === 0){
          continue
        }

        //commonRatedPItems is a list of the items the two users have both rated
        let commonRatedItems = ratedItemsInCommonMatrix[userIndex][otherUserIndex]
        //find out what they each have in common
        //loop through this new set
        let numerator = 0.0
        let denomA = 0.0
        let denomB = 0.0
        let denom = 0.0
        
        let similarityScore = 0.0
        
        for (let k = 0; k < commonRatedItems.length; k++) {
          let commonItem = commonRatedItems[k]
          
          //if, in reality, the two users have given a rating to item itemIndex, it's now the case that only the other user
          //has given it a rating. IOW, it is no longer a rated product the two have in common and can't be used as part
          //of the simlarity calculation.
          if(commonItem === itemIndex){
            continue
          }
          
            let ratingMinusAvgRatingA = ratingsMatrix[userIndex][commonItem].score - user.tempAvgRating
            let ratingMinusAvgRatingB = ratingsMatrix[otherUserIndex][commonItem].score - usersMap.get(otherUserIndex).avgRating
            numerator += ratingMinusAvgRatingA * ratingMinusAvgRatingB 
            denomA += ratingMinusAvgRatingA ** 2
            denomB += ratingMinusAvgRatingB ** 2
        }

        denom = Math.sqrt(denomA) * Math.sqrt(denomB)

        if(denom !== 0){
            similarityScore = numerator / denom
        }else{
            similarityScore = 0
        }
        if(similarityScore > threshold){

          simHeapMap.get(userIndex).push(
              {
                  userIndex: otherUserIndex, 
                  score: similarityScore
              })
        }
    }

    if(simHeapMap.get(userIndex).numOfElements() === 0){
        predictedRating = user.tempAvgRating
    }else{
        let numOfNeighboursToUse = 0
        simHeapMap.get(userIndex).numOfElements() >= neighbourhoodSize ? numOfNeighboursToUse = neighbourhoodSize : numOfNeighboursToUse = simHeapMap.get(userIndex).numOfElements()
        let denom = 0.0
        let numerator = 0.0
        for (let p = 0; p < numOfNeighboursToUse; p++) {
          let similarUser = simHeapMap.get(userIndex).pop()
          denom += similarUser.score
          numerator += similarUser.score * (ratingsMatrix[similarUser.userIndex][itemIndex].score - usersMap.get(similarUser.userIndex).avgRating)
          
        }
        if(denom == 0){
          predictedRating = user.tempAvgRating
        } else {
          predictedRating = user.tempAvgRating + (numerator/denom)
        }

        if(predictedRating < 1.0){
          predictedRating = 1.0
        } else if (predictedRating > 5.0) {
          predictedRating = 5.0
        }
    
    }

    mae += Math.abs(originalRating - predictedRating)
    
    let maxHeap = new MaxHeap()
    simHeapMap.set(userIndex, maxHeap)
  }

  //compute the MAE
  mae = mae / ratedItems.length
  
  console.timeEnd("Execution Time")
  console.log(mae)
}

//Uncomment function call below, varying neighbourhood size and threshold.

//leaveOneOut(164, 0)