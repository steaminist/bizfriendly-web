var instructions = (function (instructions) { 
  // private properties
  // var debug = true;
  var debug = false;
  var width = window.screen.width;
  var height = window.screen.height;
  var bodyPadding = 0;
  var lessonId = 0; // Blank lesson
  var lesson = {};
  var steps = [];
  var step = {};
  var oauthToken = null;
  var currentStep = {};
  var bfUrl = 'https://app.bizfriend.ly';
  // var bfUrl = 'https://app-staging.bizfriend.ly';
  // var bfUrl = 'http://127.0.0.1:8000';
  var bfApiVersion = '/api/v1';
  var rememberedAttribute;
  var postData = {};
  var originalCount = false;
  var challengeWindow;

  // PUBLIC METHODS
  // initialize variables and load JSON
  function init(){
    if (debug) console.log('init');
    // Get lessonId from the url
    lessonId = window.location.search.split('?')[1];
    // Call the API and get that lesson
    $.getJSON(bfUrl+bfApiVersion+'/lessons/'+lessonId, _main);
  }

  // PRIVATE METHODS 

  // Main Function
  function _main(response){
    _checkWindowSize();
    // Attach response to global lesson variable
    lesson = response;
    // Set the name of the lesson
    $('#instructions-title').html(lesson.name);
    // Make sure steps are in order of id
    _orderSteps();
    // Convert python names to javascript names
    _convertStepsAttributesNames();
    // Set current step
    currentStep = steps[0];
    // Initialize steps state
    _updateStepsStates();
    //Build progress bar
    _makeProgressBar();
    // Update progress Bar
    _updateProgressBar();
    // Show first step
    _showStep();
    _checkStep();
    // Adds button event handlers
    $('#back').click(_backClicked);
    $('#next').click(_nextClicked);
  }

  function _checkWindowSize(){
    if (debug) console.log(window.innerWidth);
    if(window.innerWidth > 340){
      window.resizeTo(340,height);
      window.moveTo(width-340,0);
    }
  }

  function _orderSteps(){
    if (debug) console.log('ordering steps');
    steps = lesson.steps.sort(function(a, b){
      if (a.step_number < b.step_number) return -1;
      if (a.step_number > b.step_number) return 1;
      return 0;
    })
  }

  // Change steps attributes to have camelCase
  function _convertStepsAttributesNames(){
    if (debug) console.log('Change attribute names to camelCase.');
    var stepsWithJsNames = [];
    $(steps).each(function(i){
      step = {
        id : steps[i].id,
        name : steps[i].name,
        stepType : steps[i].step_type,
        stepNumber : steps[i].step_number,
        stepText : steps[i].step_text,
        triggerEndpoint : steps[i].trigger_endpoint,
        triggerCheck : steps[i].trigger_check,
        triggerValue : steps[i].trigger_value,
        thingToRemember : steps[i].thing_to_remember,
        feedback : steps[i].feedback,
        nextStepNumber : steps[i].next_step_number,
        stepState : "unfinished"
      }
      stepsWithJsNames.push(step);
    })
    steps = stepsWithJsNames;
  }

  // Set the steps state
  function _updateStepsStates(){
    if (debug) console.log('updating steps states');
    $(steps).each(function(i){
      if (currentStep.stepNumber == steps[i].stepNumber){
        steps[i].stepState = "active";
      }
      if (currentStep.stepNumber > steps[i].stepNumber){
        steps[i].stepState = "finished";
      }
      if (currentStep.stepNumber < steps[i].stepNumber){
        steps[i].stepState = "unfinished";
      }
    })
  }

  // Make progress bar
  function _makeProgressBar(){
    if (debug) console.log('making progress bar');
    $(steps).each(function(i){
        $('#progress').append('<li id="step'+steps[i].stepNumber+'_progress"></li>');
    });
    // Todo: Need to account for 12 possible steps
    // var widthPercent = '';
    // widthPercent = 100/steps.length+'%';
    // $('#progress li').attr('width',widthPercent);
  }

  // Update the progress bar
  function _updateProgressBar(){
    if (debug) console.log('updating progress bar');
    $(steps).each(function(i){
      $('#step'+steps[i].stepNumber+'_progress').removeClass('unfinished active finished').addClass(steps[i].stepState);
      if (steps[i].stepNumber == currentStep.stepNumber){
        $('#step'+steps[i].stepNumber+'_progress').html('<h2>'+currentStep.stepNumber+'</h2>');
      } else {
        $('#step'+steps[i].stepNumber+'_progress').html('');
      }
    })
  }

  // Show the current step
  function _showStep(){
    _stepTransition();
    if (debug) console.log('showing step');
    $('section').attr('id','step'+currentStep.stepNumber);
    // $('section h2').html(currentStep.name);
    $('.step_text').html(currentStep.stepText);
    $('.feedback').html(currentStep.feedback);
    // Set step_text back to visible and hide others
    if ($('.step_text').css('display') == 'none'){
      $('.step_text').toggle();
    }
    if ($('.feedback').css('display') == 'block'){
      $('.feedback').toggle();
    }
    if ($('#next').hasClass('animated pulse')){
      $('#next').removeClass('animated pulse');
    }
    if ($('#congrats').css('display') == 'block'){
      // $('#additional-resource').attr('href=http://bizfriend.ly/lesson.html?'+lessonId);
      // $('#additional-resource').attr('target','_parent');
      $('#congrats').toggle();
    }
  }

  function _stepTransition(){
    if (debug) console.log('Step Transition');
  }

  // next button is clicked
  function _nextClicked(evt){
    if (currentStep.stepNumber < steps.length){
      currentStep = steps[currentStep.stepNumber];
      _updateStepsStates();
      _updateProgressBar();
      // Record most recent opened step 
      // BfUser.record_step(currentStep, _recordedStep);
      _showStep();
      _checkStep();
    }
  }

  // back button is clicked
  function _backClicked(evt){
    if (currentStep.stepNumber > 1){
      currentStep = steps[currentStep.stepNumber - 2];
      _updateStepsStates();
      _updateProgressBar();
      _showStep();
      _checkStep();
    }
  }

  // login clicked
  function _loginClicked(evt){
    if (debug) console.log('login clicked');
    OAuth.initialize('uZPlfdN3A_QxVTWR2s9-A8NEyZs');
    OAuth.popup(lesson.third_party_service, function(error, result) {
      //handle error with error
      if (error) console.log(error);
      oauthToken = result.access_token;

      // Add connection to server db
      var data = {service: lesson.third_party_service, service_access: oauthToken}
      BfUser.create_connection(data, _createdConnection);

      // Check first step
      _checkStep();  
    }); 
  }

  // Check steps
  function _checkStep(){
    if (debug) console.log(currentStep.name);

    // Create postData
    postData = {
      currentStep : currentStep,
      rememberedAttribute : rememberedAttribute,
      lessonName : lesson.name,
      lessonId : lesson.id,
      thirdPartyService : lesson.third_party_service,
      originalCount : false
    }

    // If step type is login
    if (currentStep.stepType == 'login'){
        // First step should have a login button
        if (!oauthToken){
          $('#login').click(_loginClicked);
        }
        else {
          _loggedIn();
        }
    }

    // If step type is open
    if (currentStep.stepType == 'open'){
      $(".open").click(_openClicked);
    }

    // If step type is check_for_new
    if (currentStep.stepType == 'check_for_new' && oauthToken){
      console.log(originalCount);
      // This step fires at least twice. First time it just gets the originalCount
      // Every following time it compares the number of objects to the originalCount
      if ( originalCount ){
        if (debug) console.log("originalCount: " + originalCount);
        postData["originalCount"] = originalCount;
      }
      BfUser.check_for_new(postData, _checkForNew);
    }
    // check_if_attribute_exists
    if (currentStep.stepType == 'check_if_attribute_exists' && oauthToken){
      if (debug) console.log(currentStep);
      BfUser.check_if_attribute_exists(postData, _checkIfAttributeExists);
    }

    // check_attribute_for_value
    if (currentStep.stepType == 'check_attribute_for_value' && oauthToken){
      BfUser.check_attribute_for_value(postData, _checkAttributeForValue);
    }

    // Is step type get_attributes_from_input
    if (currentStep.stepType == 'get_attributes_from_input'){
      // First get the id from the input
      $('#userInputSubmit').click(function(evt){
        var userInput = $('#userInput').val();
        // If Foursquare, get venue id from input URL.
        if (lesson.third_party_service == 'foursquare'){
          var userInputPath = userInput.split( '/' );
          rememberedAttribute = userInputPath.pop();
        }
        challengeWindow.close();
        _openChallengeWindow(userInput);

        postData["rememberedAttribute"] = rememberedAttribute;
        // Then call get_attributes
        BfUser.get_attributes(postData, _getAttributes);
      });
    }

    // congrats
    if (currentStep.stepType == 'congrats'){
      $('#fb-share').attr('href', 'http://api.addthis.com/oexchange/0.8/forward/facebook/offer?pubId=ra-52043c6b31185dab&url=http://bizfriend.ly/lesson.html?'+lessonId);
      $('#tw-share').attr('href', 'http://api.addthis.com/oexchange/0.8/forward/twitter/offer?pubId=ra-52043c6b31185dab&url=http://bizfriend.ly/lesson.html?'+lessonId+'&text=I just finished '+lesson.name+' with help from BizFriendly!');
      $('#g-share').attr('href', 'http://api.addthis.com/oexchange/0.8/forward/google_plusone_share/offer?pubId=ra-52043c6b31185dab&url=http://bizfriend.ly/lesson.html?'+lessonId);
      $('#li-share').attr('href', 'http://api.addthis.com/oexchange/0.8/forward/linkedin/offer?pubId=ra-52043c6b31185dab&url=http://bizfriend.ly/lesson.html?'+lessonId);
      $('#additional-resources').click(function(evt){
        window.close();
      });
      $('#more-lessons').click(function(evt){
        window.opener.location.href='learn.html';
        window.close();
      });
      _showCongrats();
    }

    // Add example popover clicker
    var example = $('#example').html();
    $('#example').css('display','none');
    $('#popover').popover({ content: example, html: true, placement: 'top', trigger: 'hover' });
  }

  // They are loggedIn
  function _loggedIn(){
      $('#step'+currentStep.stepNumber+' .step_text').css('display','none');
      $('#step'+currentStep.stepNumber+' .feedback').css('display','block');
      $('#next').addClass('animated pulse');
  }

  // Saved a connection in the db
  function _createdConnection(response){
    if (debug) console.log(response);
  }

  function _recordedStep(response){
    if (debug) console.log(response);
  }

  // Open up the main window to the web service we want to teach.
  function _openChallengeWindow(url){
    var width = window.screen.width;
    var height = window.screen.height;
    var challengeFeatures = {
      height: height,
      width: width - 340,
      name: 'challenge',
      center: false
    }
    challengeWindow = $.popupWindow(url, challengeFeatures);
  }

  // .open is clicked
  function _openClicked(evt){
    _openChallengeWindow(currentStep.triggerEndpoint);
    
    // Advance to next step
    currentStep = steps[currentStep.stepNumber];
    if ($('.feedback').css('display') == 'block'){
      $('.feedback').toggle();
    }
    if ($('.step_text').css('display') == 'none'){
      $('.step_text').toggle();
    }
    _updateStepsStates();
    _updateProgressBar();
    // Record most recent opened step 
    // BfUser.record_step(currentStep, _recordedStep);
    _showStep();
    _checkStep();
  }

  // A new object is added at a url endpoint
  // Remember a certain attribute, object id for example.
  // Display another attribute
  function _checkForNew(response){
    if (debug) console.log(response);
    response = $.parseJSON(response);
    if (response.timeout) _checkStep();
    if ( !response.new_object_added ){
      if ( response.original_count != false ){
        // If no new thing added, yet there is an original count
        // then ask again with the count in the post data.
        originalCount = response.original_count;
        _checkStep();
      }
    }
    if ( response.new_object_added ){
      // Remember the attribute!
      rememberedAttribute = response.attribute_to_remember;
      $('#step'+currentStep.stepNumber+' .feedback .responseDisplay').html(response.attribute_to_display);
      $('#step'+currentStep.stepNumber+' .step_text').css('display','none');
      $('#step'+currentStep.stepNumber+' .feedback').css('display','block');
      $('#next').addClass('animated pulse');
    }
  }

  // A certain attribute exists at the url endpoint
  // Display the returned attribute
  function _checkIfAttributeExists(response){
    if (debug) console.log(response);
    response = $.parseJSON(response);
    if (response.timeout) _checkStep();
    if ( response.attribute_exists ){
      $('#step'+currentStep.stepNumber+' .feedback .responseDisplay').html(response.attribute_to_display);
      $('#step'+currentStep.stepNumber+' .step_text').css('display','none');
      $('#step'+currentStep.stepNumber+' .feedback').css('display','block');
      $('#next').addClass('animated pulse');
    }
  }

  // A certain attribute equals a determined value
  // Display the returned attribute
  function _checkAttributeForValue(response){
    if (debug) console.log(response);
    response = $.parseJSON(response);
    if (response.timeout) _checkStep();
    if (response.attribute_value_matches) {
      if (lesson.third_party_service == 'facebook'){
        $('#step'+currentStep.stepNumber+' .feedback .responseDisplay').attr('src',response.attribute_to_display);
      }
      if ( lesson.third_party_service == 'foursquare'){
        $('#step'+currentStep.stepNumber+' .feedback .responseDisplay').html(response.attribute_to_display);
      }
      $('#step'+currentStep.stepNumber+' .step_text').css('display','none');
      $('#step'+currentStep.stepNumber+' .feedback').css('display','block');
      $('#next').addClass('animated pulse');
    }
  }

  // Display the returned attributes
  function _getAttributes(response){
    if (debug) console.log(response);
    response = $.parseJSON(response);
    $('#step'+currentStep.stepNumber+' .feedback #attribute').html(response.attribute);
    $('#step'+currentStep.stepNumber+' .feedback #attribute-2').html(response.attribute_2);
    $('#step'+currentStep.stepNumber+' .feedback #attribute-3').html(response.attribute_3);
    $('#step'+currentStep.stepNumber+' .step_text').css('display','none');
    $('#step'+currentStep.stepNumber+' .feedback').css('display','block');
    $('#next').addClass('animated pulse');
  }


  function _showCongrats(){
    $('section h2').toggle();
    $('.step_text').toggle();
    $('#controls').toggle();
    $('#congrats').css('display','block');
  }

  // add public methods to the returned module and return it
  instructions.init = init;
  return instructions;
}(instructions || {}));

// initialize the module
instructions.init()