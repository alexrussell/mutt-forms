/**
* @file Boolean Field
*/

'use strict'

import MuttRegistry from '../registry'
import {Field} from './core'
import {CheckboxInput} from '../widgets/checkbox'

function toBool(value) {
    if(value === undefined) {
        return null
    }

    switch(value.toLowerCase().trim()) {
    case 'true':
    case 'yes':
    case '1':
        return true

    case 'false':
    case 'no':
    case '0':
    case null:
        return false

    default:
        return Boolean(value)
    }
}

/**
* Boolean field, used to capture true/false inputs
* @class
*/
export class BooleanField extends Field {

    /**
    * Property - get/set value
    */
    get value() {
        let value = this.widget.getValue()

        // Widgets deal with the HTML value, which
        // can not represent a boolean. Coerce to
        // the expected type
        return toBool(value)
    }

    set value(value) {
        this.widget.setValue(value)
    }

    /**
    * Get the widget for the field
    * @returns {Widget}
    */
    getWidget() {
        return CheckboxInput
    }
}

MuttRegistry.registerField('boolean', BooleanField)
