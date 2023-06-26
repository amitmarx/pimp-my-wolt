chrome.tabs.onUpdated.addListener((tabId, tab) => {
    //TODO - Wait for Foodspar to see if they can help out with a order history API as this will be way more feasible.
     // call contentScript to fetch restaurants IDs to check if the customer has -
        //already ordered. (todo - check how to fetch the orders history,
         //maybe redirect quickly? or part of a setup? we'll see)
         if (tab.url && tab.url.includes("https://wolt.com/en/discovery/restaurants")) {
            //add a text box inside the rest. div - "You didn't try me yet!"  for restaurants
            // which do not exist in the order history list
        }
        else if (tab.url && tab.url.includes("https://wolt.com/he/discovery/restaurants"))
        {
            //same as above, just in hebrew. "עוד לא ניסית אותי!"
        }
});
