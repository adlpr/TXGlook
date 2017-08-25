/* jQuery initializations */
$(function() {
  // Toggles & toggle icons
  $('.toggler').click(function() {
    $(this).next('div').slideToggle();
    if ($(this).attr('class').includes('glyphicon-plus-sign'))
      $(this).removeClass('glyphicon-plus-sign').addClass('glyphicon-minus-sign');
    else
      $(this).removeClass('glyphicon-minus-sign').addClass('glyphicon-plus-sign');
  });
});
/* end jQuery initializations */


// insert components into document
function insertComponents(maxPerRow=14) {
  var componentTable = document.getElementById("component-table");
  componentActivationStatus = {}; // store activation status (default 0)
  componentTable.innerHTML = '';
  
  // active component row
  componentTable.innerHTML +=
    '<div id="active-components-row" class="row component-row">'+
    '<div class="col-sm-1 component-stroke-count"><span class="glyphicon glyphicon-search"></span></div>'+
    '<div id="active-components" class="col-sm-11 component-list"></div>'+
    '</div>';
  
  for (var strokeCount in componentList) {
    var rowHTML = '';
    rowHTML += '<div class="row component-row">'
    rowHTML += '<div class="col-sm-1 component-stroke-count">' + strokeCount + '</div>'
    rowHTML += '<div class="col-sm-11 component-list">'
    var components = componentList[strokeCount]
    for (var i in components) {
      componentActivationStatus[components[i]] = 0;
      if (i == maxPerRow+1)
        rowHTML += '<span class="toggler glyphicon glyphicon-plus-sign"></span><div class="toggled">'
      rowHTML += '<span id="component-'+components[i]+'" class="component-inactive" onclick="toggleComponent(\''+components[i]+'\');">'+components[i]+'</span>'
    }
    if (components.length > maxPerRow)
      rowHTML += '</div>';
    rowHTML += '</div></div>'
    componentTable.innerHTML += rowHTML;
  }
}


// writing mode (LTR / TTB) button handling
function switchWritingMode(mode) {
  document.getElementById("output").style["writing-mode"] = mode;
}


// update rollover info text
function rolloverResult(tangraph) {
  document.getElementById("rollover-info").innerHTML = tangraph + ' ' + tangraphInfo[tangraph][3];
}


// update list of result tangraphs on page; max 80
function updatePageResults(maxChars=80) {
  var resultUl = document.getElementById("result-list");
  resultUl.innerHTML = '';
  for (const i in resultList) {
    if (i >= maxChars) break;
    var tangraph = resultList[i];
    resultUl.innerHTML +=
      '<li class="results-item" onmouseover="rolloverResult(\'' + tangraph +
      '\');" onclick="insertAtCursor(\'output\', \'' + tangraph +
      '\');">' + tangraph + '</li>';
  }
}


// insert clicked result character into given area
function insertAtCursor(elementId, char) {
  // if tangraph clicked, clear components
  if (elementId == "output")
    clearComponents();
  
  var output = document.getElementById(elementId)
  // IE support
  if (document.selection) {
    output.focus();
    sel = document.selection.createRange();
    sel.text = char;
  }
  // others
  else if (output.selectionStart || output.selectionStart == '0') {
    var startPos = output.selectionStart;
    var endPos = output.selectionEnd;
    output.value = output.value.substring(0, startPos)
      + char
      + output.value.substring(endPos, output.value.length);
  } else {
    output.value += char;
  }
}


// toggle component activation status
function toggleComponent(component) {
  // first check current activation status (primary/secondary/none)
  if (componentActivationStatus[component] == 1)
    componentActivationStatus[component] = 0;
  else
    componentActivationStatus[component] = 1;
  updateSecondaryAndTertiaryComponents();
  updatePageComponents();
  updateResultsList();
  insertActiveComponents();
}


// clear all components
function clearComponents(component) {
  for (var component in componentActivationStatus)
    if (componentActivationStatus[component] > 0)
      componentActivationStatus[component] = 0;
  updatePageComponents();
  updateResultsList();
  insertActiveComponents();
}


// change status of components associated with current primary activated ones
function updateSecondaryAndTertiaryComponents() {
  // first clear all
  for (var component in componentInfo)
    if (componentActivationStatus[component] > 1)
      componentActivationStatus[component] = 0;
  for (var component in componentInfo) {
    if (componentActivationStatus[component] == 1) {
      // give components in IDS secondary activation
      ids = Array.from(componentInfo[component][0].replace(/[⿰-⿻]/g, ""));
      for (var i in ids)
        if (componentActivationStatus[ids[i]] == 0)
          componentActivationStatus[ids[i]] = 2;
      // give extra components tertiary activation
      extraComponents = Array.from(componentInfo[component][1]);
      for (var i in extraComponents)
        if (componentActivationStatus[extraComponents[i]] == 0)
          componentActivationStatus[extraComponents[i]] = 3;
    }
  }
}


// update display (css classes) of components on page
function updatePageComponents() {
  for (var component in componentInfo) {
    var componentElement = document.getElementById("component-"+component);
    switch (componentActivationStatus[component]) {
      case 0:
        componentElement.className = 'component-inactive';
        break;
      case 1:
        componentElement.className = 'component-active';
        break;
      case 2:
        componentElement.className = 'component-active2';
        break;
      case 3:
        componentElement.className = 'component-active3';
    }
  }
}


// insert copies of active components into top row
function insertActiveComponents() {
  var activeComponentsRow = document.getElementById("active-components");
  activeComponentsRow.innerHTML = '';
  
  for (var i in activatedComponents[1]) {
    var tangraph = activatedComponents[1][i];
    activeComponentsRow.innerHTML +=
      '<span class="component-active" onclick="toggleComponent(\'' +
      tangraph + '\');">'+tangraph+'</span>';
  }
  
  if (activatedComponents[1].length > 0)
    activeComponentsRow.innerHTML += '<span class="glyphicon glyphicon-remove" title="Clear all components" onclick="clearComponents();"></span>';
}


var lastRegex = "";

// listeners - update with every key press / checkbox change
var strokeEntryField = document.getElementById("stroke-entry-field");
window.onkeyup = updateStrokeEntry;
var strokeBeginsWith = document.getElementById("stroke-begins-with");
var strokeEndsWith = document.getElementById("stroke-ends-with");
strokeBeginsWith.addEventListener('change', updateStrokeEntry);
strokeEndsWith.addEventListener('change', updateStrokeEntry);


// repopulate results list based on currently activated components
function updateResultsList() {
  resultList = [];
  
  if (strokeEntryField.value != "") {
    // strokes
    // build regex
    var strokesRegex = strokeEntryField.value.replace("*",".*");
    if (strokeBeginsWith.checked)
      strokesRegex = "^" + strokesRegex;
    if (strokeEndsWith.checked)
      strokesRegex += "$";
    // display characters that start with the sequence
    // before those that just contain it
    var startsWithSeq = [];
    var containsSeq = [];
    for (var tangraph in tangraphInfo) {
      let strokeSeq = tangraphInfo[tangraph][2];
      if (strokeSeq.search("^"+strokesRegex) >= 0)
        startsWithSeq.push(tangraph);
      else if (strokeSeq.search(strokesRegex) >= 0)
        containsSeq.push(tangraph);
    }
    resultList = startsWithSeq.concat(containsSeq);
  } else {
    // components
    // update currently activated components
    activatedComponents = [[],[],[],[]];
    for (var component in componentInfo) {
      var status = componentActivationStatus[component];
      if (status > 0)
        activatedComponents[status].push(component);
    }
    
    // generate score for each tangraph
    var tangraphScores = {}
    for (var tangraph in tangraphInfo) {
      var ratioActivatedComponent1InIDS      = ratioOfSubstrings(activatedComponents[1], tangraphInfo[tangraph][0]);
      var ratioActivatedComponent2InIDS      = ratioOfSubstrings(activatedComponents[2], tangraphInfo[tangraph][0]);
      var ratioActivatedComponent3InIDS      = ratioOfSubstrings(activatedComponents[3], tangraphInfo[tangraph][0]);
      var ratioActivatedComponent1InExtended = ratioOfSubstrings(activatedComponents[1], tangraphInfo[tangraph][1]);
      var ratioActivatedComponent2InExtended = ratioOfSubstrings(activatedComponents[2], tangraphInfo[tangraph][1]);
      var ratioActivatedComponent3InExtended = ratioOfSubstrings(activatedComponents[3], tangraphInfo[tangraph][1]);
      var tangraphScore =
        (((2*ratioActivatedComponent1InIDS)-0.5)      * 1000000.0) + 
        (((2*ratioActivatedComponent2InIDS)-0.5)      * 100000.0) + 
        (((2*ratioActivatedComponent3InIDS)-0.5)      * 10000.0) + 
        (((2*ratioActivatedComponent1InExtended)-0.5) * 1000.0) + 
        (((2*ratioActivatedComponent2InExtended)-0.5) * 100.0) + 
        (((2*ratioActivatedComponent3InExtended)-0.5) * 10.0) -
        (tangraphInfo[tangraph][0].length - activatedComponents[1].length);
      tangraphScores[tangraph] = tangraphScore;
    }
    
    // push in descending score order
    var allTangraphs = Object.keys(tangraphInfo);
    allTangraphs.sort(function(a,b){return tangraphScores[b]-tangraphScores[a];});
    for (i in allTangraphs)
      if (tangraphScores[allTangraphs[i]] > 0)
        resultList.push(allTangraphs[i]);
  }
  
  updatePageResults();
}


// map whether each string in arr is a substring of str,
// then take ratio of "true" results
// (except if arr is empty, in which case always return 1)
function ratioOfSubstrings(arr, str) {
  if (arr.length == 0)
    return 1;
  else {
    var count = 0;
    var mapped = arr.map(function(c){return str.includes(c);});
    for (i in mapped)
      if (mapped[i])
        count++;
    return count / arr.length;
  }
}

function toggleCheckbox(id) {
  document.getElementById(id).checked = !document.getElementById(id).checked;
  updateStrokeEntry();
}

// insert with click
function insertStroke(stroke) {
  strokeEntryField.value += stroke;
  updateStrokeEntry();
}

function updateStrokeEntry() {
  strokeEntryField.value = strokeEntryField.value.toUpperCase().replace(/[^A-Q.*]/g, "");
  updateResultsList();
}

function clearStrokeEntryField() {
  strokeEntryField.value = "";
  updateResultsList();
}


// on-document-load stuff
insertComponents();
var activatedComponents = [[],[],[],[]];
var resultList = [];
updateResultsList();
