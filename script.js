var searchInput = document.querySelector("#search-input");
var searchButton = document.querySelector("#search-button");
var confirmLocationModal = document.querySelector("#confirm-location-modal");
var searchHistoryItems = document.querySelector("#search-history-items");
var currentWeatherCity = document.querySelector("#current-weather-city");
var currentWeatherData = document.querySelector("#current-weather");
var forecastElement = document.querySelector("#forecast");

var displayName;
var searchTerms = [];
var searchHistory = [];

// Displays the location by city, state and coountry
var defineDisplayName = function(location) {

    var city = location.adminArea5;
    var state = location.adminArea3;
    var country = location.adminArea1;

    var tempDisplayName = [];
    if (city) {
        tempDisplayName.push(city);
    }
    if (state) {
        tempDisplayName.push(state);
    }
    if (country) {
        tempDisplayName.push(country);
    }

    return tempDisplayName.join(", ");
}

// Gives multiple locations if what the user is looking for has multiple results
var confirmLocation = function(locationsArray) {

    var formBody = confirmLocationModal.querySelector("#confirm-location-form-body");
    formBody.innerHTML = "";

    // set up the modal
    for (let i=0; i < locationsArray.length; i++) {

        // create the container
        var searchResultContainer = document.createElement("div");
        searchResultContainer.classList.add("search-result-item", "uk-form-controls", "uk-margin");

        // create the radio button
        var searchResultInput = document.createElement("input");
        searchResultInput.setAttribute("type", "radio");
        searchResultInput.setAttribute("name", "search-result");
        searchResultInput.setAttribute("id", "search-result-" + i);
        searchResultInput.setAttribute("data-location", JSON.stringify(locationsArray[i]));
        searchResultContainer.appendChild(searchResultInput);

        // create the label
        var modalDisplayName = defineDisplayName(locationsArray[i]);
        var searchResultLabel = document.createElement("label");
        searchResultLabel.innerText = modalDisplayName;
        searchResultLabel.setAttribute("for", "search-result-" + i);
        searchResultContainer.appendChild(searchResultLabel);

        // add the container to the form
        formBody.appendChild(searchResultContainer);
    }

    // display the modal
    UIkit.modal("#confirm-location-modal").show();
}

// Save to localStorage
var saveLocation = function(location) {

    displayName = defineDisplayName(location);

    if (searchTerms.includes(displayName)) {

        // remove the display name from the search arrays
        var index = searchTerms.indexOf(displayName);
        searchTerms.splice(index, 1);
        searchHistory.splice(index, 1);

        // remove the element
        var dataLocationName = displayName.split(" ").join("+");
        var searchHistoryItem = searchHistoryItems.querySelector("[data-location-name='" + dataLocationName + "']");
        searchHistoryItems.removeChild(searchHistoryItem);
    }

    // define the object to save
    var cityData = {
        displayName: displayName,
        coords: location.latLng
    };

    // update the search history arrays
    if (searchTerms.length == 5) {

        // remove the last element from the array
        searchTerms.splice(0, 1);
        searchHistory.splice(0, 1);

        // remove it from the DOM
        var fifthChild = searchHistoryItems.childNodes[4];
        searchHistoryItems.removeChild(fifthChild);
    }
    searchTerms.push(displayName);
    searchHistory.push(cityData);

    // update localStorage
    localStorageHistory = {
        searchTerms: searchTerms,
        searchHistory: searchHistory
    }
    localStorage.setItem("searchHistory", JSON.stringify(localStorageHistory));

    createSearchHistoryElement(cityData);
}

// Using API to get a location
var getCoordinates = function(searchTerm) {

    searchTerm = searchTerm.split(" ").join("+");
    var geocodingApiUrl = "https://www.mapquestapi.com/geocoding/v1/address?key=ZJUiXdZZzhsEe05eUGvmmAsIoTPvQOHn&location=" + searchTerm;
    fetch(geocodingApiUrl).then(function(res) {
        if (res.ok) {
            res.json().then(function(data) {

                // find one location to use to generate the weather
                var locations = data.results[0].locations;
                if (locations.length == 1) {
                    saveLocation(locations[0]);
                    getWeather(locations[0].latLng);
                } else {
                    confirmLocation(locations);
                }
            })
        } else {
            console.log("Location not found: ", res.text);
        }
    });
}

// Using API to get the weather
var getWeather = function(coords) {

    var weatherApiUrl = "https://api.openweathermap.org/data/2.5/onecall?lat=" + coords.lat + "&lon=" + coords.lng + "&units=metric&exclude=minutely,hourly&appid=3efc587005200cdf1f242650ff091998";
    fetch(weatherApiUrl).then(function(res){
        if (res.ok) {
            res.json().then(function(data){
                displayWeather(data); 
            })
        } else {
            console.log("Weather not found: ", res.text);
        }
    })
}

// Search history
var createSearchHistoryElement = function(searchHistoryData) {
    
    var searchHistoryHeader = document.querySelector("#search-history-title");
    searchHistoryHeader.style.display = "block";

    // create the card for the location
    var newCard = document.createElement("div");
    newCard.classList = "uk-card-default uk-card uk-card-body uk-card-hover uk-card-small uk-text-center search-history-item";
    newCard.textContent = searchHistoryData.displayName;
    newCard.setAttribute("data-location-name", searchHistoryData.displayName.split(" ").join("+"));
    searchHistoryItems.insertBefore(newCard, searchHistoryItems.firstChild);
}

// Display the search history
var displaySearchHistory = function() {

    var loadedSearchHistory = JSON.parse(localStorage.getItem("searchHistory"));
    if(loadedSearchHistory) {
        searchTerms = loadedSearchHistory.searchTerms;
        searchHistory = loadedSearchHistory.searchHistory;
        for (var i=0; i < searchTerms.length; i++) {
            if (!searchTerms.includes(searchHistory[i])) {
                createSearchHistoryElement(searchHistory[i]);
            }
        }
    }
}

var displayIcon = function(iconElement, iconCode, iconAlt) {

    var iconSrc = "https://openweathermap.org/img/w/" + iconCode + ".png";
    iconElement.setAttribute("src", iconSrc);
    iconElement.setAttribute("alt", iconAlt);

}

// Display current weather
var displayWeather = function(weatherData) {

    // city 
    currentWeatherCity.textContent = displayName;

    // date
    var dateElement = currentWeatherData.querySelector("#current-weather-date");
    var unixDate = weatherData.current.dt;
    var formattedDate =  moment.unix(unixDate).format("dddd, MMMM Do");
    dateElement.textContent = formattedDate;

    // weather 
    var iconElement = currentWeatherData.querySelector("#current-weather-icon");
    var iconCode = weatherData.current.weather[0].icon;
    var iconAlt = weatherData.current.weather[0].description + " icon";
    displayIcon(iconElement, iconCode, iconAlt);

    // humidity
    var humidityElement = currentWeatherData.querySelector("#current-weather-humidity");
    var humidity = weatherData.current.humidity;  // percentage
    humidityElement.textContent = "Humidity: " + humidity + "%";

    // current temp
    var temperatureElement = currentWeatherData.querySelector("#current-weather-current-temp");
    var temperature = Math.floor(weatherData.current.temp);  // fahrenheit if imperial, celsius if metric
    temperatureElement.textContent = "Current Temperature: " + temperature + "°C";

    // minimum temp
    var minTempElement = currentWeatherData.querySelector("#current-weather-min-temp");
    var minTemp = Math.floor(weatherData.daily[0].temp.min);  // fahrenheit if imperial, celsius if metric
    minTempElement.textContent = "Low: " + minTemp + "°C";

    // maximum temp
    var maxTempElement = currentWeatherData.querySelector("#current-weather-max-temp");
    var maxTemp = Math.floor(weatherData.daily[0].temp.max);  // fahrenheit if imperial, celsius if metric
    maxTempElement.textContent = "High: " + maxTemp + "°C";

    // wind speed
    var windSpeedElement = currentWeatherData.querySelector("#current-weather-wind-speed");
    var windSpeed = weatherData.current.wind_speed;  // mph if imperial, m/s if metric
    windSpeedElement.textContent = "Wind Speed: " + windSpeed + " miles per hour";

    // uv index
    var uvIndexElement = currentWeatherData.querySelector("#current-weather-uv-index");
    uvIndexElement.innerHTML = "";
    uvIndexElement.textContent = "UV Index: ";

    var uvIndexSpan = document.createElement("span")
    var uvIndex = weatherData.current.uvi;
    uvIndexSpan.textContent = uvIndex;
    
    // update uv index text color according to the EPA sun safety scale: https://www.epa.gov/sunsafety/uv-index-scale-0
    if (uvIndex >= 8) {
        uvIndexSpan.classList.add("uk-text-danger");
    } else if (uvIndex >= 3) {
        uvIndexSpan.classList.add("uk-text-warning");
    } else {
        uvIndexSpan.classList.add("uk-text-success")
    }
    uvIndexElement.appendChild(uvIndexSpan);

    // weatherPanel and currentWeatherContainer 
    var weatherPanel = document.querySelector("#weather-panel");
    var currentWeatherContainer = document.querySelector("#current-weather-container");
    weatherPanel.style.display = "block";
    currentWeatherContainer.style.display = "block";
    
    // forecast
    displayForecast(weatherData.daily)
}

// 5-day forcast
var displayForecast = function(forecastData) {

    for (var i=1; i < 6; i++) {

        // date
        var dateElement = forecastElement.querySelector("#forecast-date-" + i);
        var unixDate = forecastData[i].dt;
        dateElement.textContent = moment.unix(unixDate).format("MMMM Do");

        // icon 
        var iconElement = forecastElement.querySelector("#forecast-icon-" + i);
        var iconCode = forecastData[i].weather[0].icon;
        var iconAlt = forecastData[i].weather[0].description;
        displayIcon(iconElement, iconCode, iconAlt);

        // humidity
        var humidityElement = forecastElement.querySelector("#forecast-humidity-" + i);
        var humidity = forecastData[i].humidity; 
        humidityElement.textContent = "Humidity: " + humidity + "%";

        // min temp
        var minTempElement = forecastElement.querySelector("#forecast-min-temp-" + i);
        var minTemp = Math.floor(forecastData[i].temp.min);  
        minTempElement.textContent = "Low: " + minTemp + "°C";

        // max temp
        var maxTempElement = forecastElement.querySelector("#forecast-max-temp-" + i);
        var maxTemp = Math.floor(forecastData[i].temp.max);  
        maxTempElement.textContent = "High: " + maxTemp + "°C";
    }

    // forecast 
    var forecastContainer = document.querySelector("#weather-forecast-container");
    forecastContainer.style.display = "block";
}

// event handler functions
var searchButtonHandler = function(event) {
    event.preventDefault();
    confirmLocationModal.querySelector("#confirm-location-form-message").classList.remove("uk-text-primary");
    var searchValue = searchInput.value;
    if (searchValue) {
        getCoordinates(searchValue);
        searchInput.value = "";
    }
}

var searchHistoryHandler = function(event) {
    if (event.target.classList.contains("search-history-item")) {
        var searchedCity = event.target.getAttribute("data-location-name");
        getCoordinates(searchedCity);
    }
}

var confirmLocationHandler = function(event){
    event.preventDefault();

    var confirmedLocation;
    var radioButtons = document.getElementsByName("search-result");
    for (var i=0; i < radioButtons.length; i++) {
        if (radioButtons[i].checked) {
            confirmedLocation = JSON.parse(radioButtons[i].getAttribute("data-location"));
        }
    }

    if (confirmedLocation) {
        UIkit.modal("#confirm-location-modal").hide();
        saveLocation(confirmedLocation);
        getWeather(confirmedLocation.latLng)
        confirmLocationModal.querySelector("#confirm-location-form-message").classList.remove("uk-text-primary");
    }
    else {  
        confirmLocationModal.querySelector("#confirm-location-form-message").classList.add("uk-text-primary");
    }
}

displaySearchHistory();
searchButton.addEventListener("click", searchButtonHandler)
searchHistoryItems.addEventListener("click", searchHistoryHandler);
confirmLocationModal.addEventListener("submit", confirmLocationHandler);