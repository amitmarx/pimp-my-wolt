// category-random files are temporary until a modal will be written. 

function rndCategory() {
    let foodArr = ['mexican', 'indian', 'italian', 'japanese', 
    'israeli', 'thai', 'asian', 'vegetarian',
    'georgian', 'ethiopian'];
    let num = 0;

    num = Math.floor(Math.random() * foodArr.length);
    document.getElementById("generated-text").innerHTML = 
    ("Looks like we are eating " +foodArr[num] + " food today!")
}