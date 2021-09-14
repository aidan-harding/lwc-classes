import { LightningElement } from 'lwc';
import {DatatableSorter} from "c/datatableSorter";

const data = [
    { id: 1, name: 'Billy Simonns', age: 40, email: 'billy@salesforce.com' },
    { id: 2, name: 'Kelsey Denesik', age: 35, email: 'kelsey@salesforce.com' },
    { id: 3, name: 'Kyle Ruecker', age: 50, email: 'kyle@salesforce.com' },
    {
        id: 4,
        name: 'Krystina Kerluke',
        age: 37,
        email: 'krystina@salesforce.com',
    },
];

const columns = [
    { label: 'Name', fieldName: 'name' },
    {
        label: 'Age',
        fieldName: 'age',
        type: 'number',
        sortable: true,
        cellAttributes: { alignment: 'left' },
    },
    { label: 'Email', fieldName: 'email', type: 'email' },
];

export default class DemoApp extends LightningElement {
    data = data;
    columns = columns;

    dataTableSorter = new DatatableSorter(this, 'data');
}
