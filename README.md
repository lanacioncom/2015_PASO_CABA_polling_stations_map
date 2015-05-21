2015 PASO CABA Elections map by polling station and political party
===================================================================

## Introduction
This project was built to visualize the results of the past 2015 PASO CABA elections in terms of which party has won in each polling station.

## Backend
For the backend we have received the results by polling table and political list as a CSV file together with other data dictionary files also as CSV.

We had also the geolocated polling stations provided by the city government in CSV format. 

We have used _csvkit_ command line binaries to crunch, clean and build the intermediate CSV files.

We have then ran them through a python script that uses _dataset_ to load them into a postgreSQL database.

We then have imported the final results to _cartodb_ postgis DB.

Usage info: [here](backend/README.md)

## Frontend
For the frontend we decided to give [_requirejs_](http://requirejs.org/) a try to be able to take a modular approach since the codebase was getting quite big.

We have found that it works nice to keep the code organized but it takes a while to get used to it, so we hope our implementation helps someone to go faster through the learning curve.

Once we finished with the development It is important that we use the [_optimizer_](http://requirejs.org/docs/optimization.html) to generate a combined javascript file and skip performing too many HTTP requests on the client side.

Since _underscore_ comes bundled inside the _cartodbjs_ library we have used it for our templates to generate a modular approach to the HTML generation. The [_requirejs text plugin_](https://github.com/requirejs/text) let's you import templates nicely into the app so that you can keep them separatedly as in our _webapp/templates_ folder.

Usage info: [here](webapp/README.md)

## Server
We are using _npm_ and _gulp_ to automate the optimization and deployment process.

The deployment takes care of minimizing, uglifying and versioning the static files so that it plays nice with the newsroom http cache configuration.

We have used the [_gulp-requirejs_](https://www.npmjs.com/package/gulp-requirejs) node package to integrate the requirejs optimization in our gulp deployment process.

Usage info: [here](server/README.md)


## Technologies && Libraries
* Backend:
    [csvkit](https://csvkit.readthedocs.org/en/0.9.1/index.html), [dataset](https://dataset.readthedocs.org/en/latest/), [cartodb](https://cartodb.com/)
* Frontend:
    [requirejs](http://requirejs.org/), [cartodbjs](http://docs.cartodb.com/cartodb-platform/cartodb-js.html), [underscore](http://underscorejs.org/)


## Credits
* [Cristian Bertelegni](https://twitter.com/cbertelegni)
* [Juan Elosua](https://twitter.com/jjelosua)
* [Gastón de la llana](https://twitter.com/gasgas83)
* [Pablo Loscri](https://twitter.com/ploscri)

## Acknowledgments

We would like to thank the creators and maintainers of the libraries used for this project and specially [Manuel Aristarán](https://twitter.com/manuelaristaran) for the original idea and initial codebase that inspired this project.



