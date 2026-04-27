//***disclaimer: createRecord & readRecords codes are AI-assisted
// 1. Global variables and initial set up
var selectedTag = "";
var correctAnswer = "";
var currentActiveSlot = 0;
var currentPage = 0;
var currentRecordId;

//2. Navigation
clearDataTable(); 
//Hide page buttons initially
hideElement("prevButton"); 
hideElement("nextButton");

//Hide all slots initially
for (var i = 1; i <= 4; i++) {
  hideElement("imageItem" + i);
  hideElement("imageButton" + i);
  hideElement("itemLabel" + i);
}

//Switch to reporting screen when "Report Item" button is clicked 
onEvent("reportButton", "click", function( ) {
  setScreen("reportScreen");
});

//Return from reporting screen to home screen when the home icon is clicked
//Clear search and report page for next report
onEvent("homeButton1", "click", function( ) {
  setScreen("homeScreen");
  setText("search", "");
  setProperty("tagSearchSelection", "value", "All");
  resetReportUI();
  updateFilteredResults(); 
});

//Return from claim screen to home screen when the home icon is clicked
//Clear search, claim page and update item list on home page
onEvent("homeButton2", "click", function( ) {
  setScreen("homeScreen");
  setText("answerInput", "");
  setText("statusID", "Status: ");
  setText("message", " ");
  setText("search", "");
  setProperty("tagSearchSelection", "value", "All");
  updateFilteredResults(); 
});

//3. Reporting
//Record tag selected by user
onEvent("tagReportSelection", "change", function( ) {
  selectedTag = getText("tagReportSelection");
  hideElement("tagPlaceholder");
});

//Update image selection slot on report screen
onEvent("uploadImageButton", "change", function( ) {
  setImageURL("uploadImage", getImageURL("uploadImageButton") || "");
  hideElement("cameraIcon");
});

//Submitting report: record new item and return to home page
onEvent("submitBTN", "click", function( ) {
  var itemFromUser = getText("itemInput");
  var locationFromUser = getText("locationInput");
  var verifyQFromUser = getText("verificationQuestionInput");
  var verifyAFromUser = getText("verificationAnswerInput");
  var imageFromUser = getImageURL("uploadImageButton") || "";
  
  createRecord("lostItem", {
    item: itemFromUser,
    itemLocation: locationFromUser,
    itemVerification: verifyQFromUser,
    itemAnswer: verifyAFromUser,
    itemImage: imageFromUser,
    category: selectedTag,
    isClaimed: false 
  }, function(record) {
    currentPage = 0; 
    updateFilteredResults(); 
  });
  
  setScreen("homeScreen");
  resetReportUI();
});

//Set program for resetting report page for next report
function resetReportUI() {
  setText("itemInput", "");
  setText("locationInput", "");
  setText("verificationQuestionInput", "");
  setText("verificationAnswerInput", "");
  setImageURL("uploadImage","");
  showElement("cameraIcon");
  setProperty("tagReportSelection", "index", 0);
  showElement("tagPlaceholder");
}

// 4. Search, Filter, and Pagination
//Show search results when user enters something in the search bar
onEvent("search", "input", function() {
  currentPage = 0; 
  updateFilteredResults();
});

//Show corresponding items when a certain tag is selected by user
onEvent("tagSearchSelection", "change", function() {
  currentPage = 0; 
  updateFilteredResults();
});

//Jump to next page for viewing items
onEvent("nextBtn", "click", function() {
  currentPage++;
  updateFilteredResults();
});

//Jump to previous page for viewing items
onEvent("prevBtn", "click", function() {
  if (currentPage > 0) {
    currentPage--;
    updateFilteredResults();
  }
});

//Set program for displaying appropriate search results in proper order and layout
function updateFilteredResults() {
  var userSearch = getText("search").toLowerCase();
  var selectedFilter = getText("tagSearchSelection");

  // Reset UI: Hide everything before redrawing
  for (var i = 1; i <= 4; i++) {
    hideElement("imageItem" + i);
    hideElement("imageButton" + i);
    hideElement("itemLabel" + i);
  }

  //Match search inputs to information stored in item list
  readRecords("lostItem", {}, function(records) {
    records.reverse();

    var matchedRecords = [];
    for (var i = 0; i < records.length; i++) {
      var itemName = (records[i].item || "").toLowerCase();
      var itemCategory = records[i].category;
      var nameMatches = (userSearch === "" || itemName.includes(userSearch));
      var categoryMatches = (selectedFilter === "All" || itemCategory === selectedFilter);

      //Only include unclaimed items (discard claimed items)
      if (nameMatches && categoryMatches && records[i].isClaimed === false) {
        matchedRecords.push(records[i]);
      }
    }

    //Assign items to correct slots on the pages
    var startIndex = currentPage * 4;
    var displayCount = 0;
    for (var j = startIndex; j < matchedRecords.length && displayCount < 4; j++) {
      if (matchedRecords[j]) {
        displayCount++;
        var slot = displayCount;
        var currentItem = matchedRecords[j];

        setImageURL("imageItem" + slot, currentItem.itemImage || "");
        setText("itemLabel" + slot, (currentItem.item || "").toString());
        
        showElement("imageItem" + slot);
        showElement("imageButton" + slot);
        showElement("itemLabel" + slot);
      }
    }

    //Only show page buttons when needed
    if (currentPage > 0) { showElement("prevBtn"); } else { hideElement("prevBtn"); }
    if (startIndex + 4 < matchedRecords.length) { showElement("nextBtn"); } else { hideElement("nextBtn"); }
  });
}

// 5. Claiming and Verification
//Bring user to claiming and verification page after clicking on a recognized item
function setupButton(idNumber) {
  onEvent("imageButton" + idNumber, "click", function( ) {
    currentActiveSlot = idNumber; 
    var searchItem = getText("itemLabel" + idNumber);
    var searchImage = getImageURL("imageItem" + idNumber);
    
    setScreen("claimDetails");
    
    //Show related information about the item provided by the reporting user
    readRecords("lostItem", {}, function(records) {
      for (var j = 0; j < records.length; j++) {
        if ((searchItem == records[j].item) && (searchImage == records[j].itemImage)){
          setText("itemNameDisplay", records[j].item || "");
          setText("locationDisplay", "Location Found: " + (records[j].itemLocation || ""));
          setImageURL("imageDisplay", records[j].itemImage || "");
          setText("verificationQuestion", records[j].itemVerification || "");
          correctAnswer = records[j].itemAnswer;
          currentRecordId = records[j].id; 
          break;
        }
      }
    });
  });
}

//Check answer for verification question
onEvent("verifyAnswerButton", "click", function( ) {
  var userAnswer = getText("answerInput");
  if (userAnswer == correctAnswer) {
    setText("statusID", "Status: Ready for pickup");
    setText("message", "Please pick up your item at 3:30pm at the main office!");
    
    //Once claimed, it will no longer show up in updateFilteredResults
    updateRecord("lostItem", {id: currentRecordId, isClaimed: true}, function(record, success) {
       // Database updated
    });
  } else {
    setText("statusID", "Status: Pending");
    setText("message", "Incorrect answer.");
  }
});

setupButton(1);
setupButton(2);
setupButton(3);
setupButton(4);

// 6. Utility
//Set program to clear all information previously stored for a reset
function clearDataTable() {
  readRecords("lostItem", {}, function(records) {
    for (var i = 0; i < records.length; i++) {
      deleteRecord("lostItem", { id: records[i].id }, function() {});
    }
  });
}
