/**
 * @author aidan@nebulaconsulting.co.uk
 * @date 14/09/2021
 * @description Use protectThis() to write LWC service classes that can be used in LWC Javascript controllers with
 * methods that can be used directly in the HTML template. Simply call protectThis(this) in your service class constructor
 *
 * Without this, class methods used in the HTML template lose their "this" reference, meaning that that cannot refer
 * to other methods or properties of the class. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#binding_this_with_prototype_and_static_methods
 */

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

export {protectThis}
