# Using Javascript Classes to share code in Salesforce LWC

It is well established that we can share code in LWC by creating a service component, then exporting functions from that
component (see the [Developer Guide](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.js_share_code)). 
But sometimes we want to share code that demands state. In a language like Java or 
Apex, we would do this by encapsulating the functions and state into a class. That class could then be shared by 
composition or inheritance. I [prefer composition to inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance) 
but LWC makes the choice for us anyway. It demands 
composition because UI components must extend LightningElement and Javascript does not support multiple inheritance 
(OK, mixins, but 🤮).

To investigate code sharing by composing classes, we take the example problem of sorting a datatable. Sorting like this has some state (the state stores which field is being sorted on, the sorting direction, etc.). It also needs to provide a method to handle the onsort event handler of lightning:datatable in the HTML template.

## The obvious way doesn't quite work

The obvious approach is to create a class that can do the sorting, while also keeping track of the current direction and field to be sorted on. Then, create an instance of that class inside the Javascript controller of your main LWC. In the HTML template of your LWC, you could bind the onsort method to the appropriate method in your class instance.

Here are some key sections of the code for that solution:

### sortedDatatable.html
```
<template>
    <lightning-datatable
            key-field="id"
            columns={columns}
            data={data}
            hide-checkbox-column
            default-sort-direction={dataTableSorter.defaultSortDirection}
            sorted-direction={dataTableSorter.sortDirection}
            sorted-by={dataTableSorter.sortedBy}
            onsort={dataTableSorter.sortData}>
    </lightning-datatable>
</template>
```

### sortedDatatable.js

```
// Setup data and columns first as constants for the demo
export default class SortedDatatable extends LightningElement {
    data = data;
    columns = columns;

    dataTableSorter = new DatatableSorter();
}
```

### datatableSorter.js
```
export class DatatableSorter {

    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy = null;
   
    // More things...
    
    sortData(event) {
        const { fieldName: fieldName, sortDirection } = event.detail;
        // Do the sorting...
    }
}
```
Sadly, this does not quite work. The event handler is not called properly, so the sorting action has no effect.

## The Problem

The problem is not specific to LWC. It’s a general property of [how classes work in Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#binding_this_with_prototype_and_static_methods). 
When you call a method as `instance.method()`, then the method call has the `this` variable set to the object instance. 
If you store the method and call it later, then `this` is not set e.g.

```
const datatableSorter = new DatatableSorter();
const sortData = datatableSorter.sortData;

// Inside the call to "sortData", this is "datatableSorter"
datatableSorter.sortData();

// Inside the call to "sortData", "this" is undefined
sortData();
```

When event handlers are invoked from an HTML template, LWC seems to solve this by setting `this` to be the 
`LightningElement` instance. Unfortunately for the example above, when `sortData()` is called, we need `this` to be the 
instance of `DatatableSorter`, not `SortedDatatable`.

## The Solution

The solution is to create a new function that calls the method using `apply` and provides the correct value for `this`. 
For example:

```
const protectedSortData = function() {
    sortData.apply(datatableSorter, arguments);
}

// Inside the call to "protectedSortData", this is "datatableSorter"
protectedSortData();
```

As long as `datatableSorter` was defined within the [closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) 
of `protectedSortData`, then this will work.

And, we can do this generically for any given class instance. We can overwrite all of its methods with versions that protect `this` using the closure.

```
function protectThis(objectInstance) {
    Object.getOwnPropertyNames( Object.getPrototypeOf(objectInstance) )
        .filter(maybeFunctionName => typeof objectInstance[maybeFunctionName] === 'function')
        .forEach(function(functionName) {
            const initialFunctionDefinition = objectInstance[functionName];
            objectInstance[functionName] = function()  {
                return initialFunctionDefinition.apply(objectInstance, arguments);
            }
        });
}
```

The above function can be called from the constructor of any class that will be used in the same way as 
`DatatableSorter`. Then, the methods of that class will be available to be used in the HTML template just as in our first attempt.

## Tracking changes

As far as I can tell, annotating data with `@track` only works for properties of the `LightningElement` class itself. 
So any classes we use inside that, such as `DatatableSorter` must write the UI-visible values to properties of the 
`LightningElement` controller.

Here, that would be `DatatableSorter` writing to `SortedDataTable.data`.

This is not hard to achieve by passing in the object instance and property name on construction i.e.

### sortedDatatable.js
```
// Setup data and columns first as constants for the demo
export default class SortedDatatable extends LightningElement {
data = data;
columns = columns;

    dataTableSorter = new DatatableSorter(this, 'data');
}
```

### datatableSorter.js
```
export class DatatableSorter {

    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy = null;
   
    // More things...

    constructor(parent, dataFieldName) {
        protectThis(this);
        this.parent = parent;
        this.dataFieldName = dataFieldName;
    }
    
    sortData(event) {
        const { fieldName: fieldName, sortDirection } = event.detail;
        const cloneData = [...this.parent[this.dataFieldName]];
        // Do the sorting...
    }
}
```

## Files and full example

This repository contains a fully worked example of the above. It uses the datatable example from the component library, 
but with the sorting rewritten to work as above.

You can push the code in this repository to a scratch org with no extra configuration. To see it in action:

1. There is a Permission Set called "LWC Classes User". Add your user to that Permission Set.
2. You will get access to a tab called "Sorted Datatable". 
3. In that tab, you will find a datatable which works just like the one in the [LWC Component Reference](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable/example). 
However, it uses the composition method described above to achieve that.
4. Note that, as in the original reference docs, the table only sorts on the Age column, but that is not a restriction of the overall approach 

- [sortedDatatable](force-app/main/default/lwc/sortedDatatable): The UI entry point containing a datatable instance in the HTML, and a DatatableSorter instance in the Javascript
- [datatableSorter](force-app/main/default/lwc/datatableSorter/datatableSorter.js): An LWC Service class containing the properties and methods for sorting. It receives a reference to the data property, and calls "protectThis" in the constructor  
- [protectThis](force-app/main/default/lwc/protectThis/protectThis.js): An LWC Service with a single function to protect the "this" reference using closures   
