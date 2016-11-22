/**
* @file Number input widget
*/

'use strict'

import MuttRegistry from '../registry'
import {Widget} from './core'

/**
* NumberInput - Standard HTML number input
* @class
*/
export class NumberInput extends Widget {

    /**
    * Render the text input field
    */
    renderField() {
        let textInput = document.createElement('input')
        textInput.setAttribute('name', this.name)
        textInput.setAttribute('type', 'number')
        textInput.setAttribute('class', this.getFieldClass())
        textInput.setAttribute('value', (this.value) ? this.value : '')

        for(let attrib in this.attribs) {
            textInput.setAttribute(attrib, this.attribs[attrib])
        }

        return textInput
    }

    /**
    * Get the class name for the widget element
    */
    getFieldClass() { return 'mutt-field mutt-field-text' }
}

MuttRegistry.registerWidget('number', NumberInput)
