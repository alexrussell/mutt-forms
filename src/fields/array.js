/**
* @file Array field
*/

'use strict'

import MuttRegistry from '../registry'
import {Field} from './core'
import {ArrayInput} from '../widgets/array'

/**
* Array is a complex field type, which is essentially a list
* of other fields.
* @class
*/
export class ArrayField extends Field {

    /**
    *
    */
    constructor({id, name, label = null, initial = null, widget = null,
        validators = [], attribs = {}, description = null, options = {},
        order = null, items = {}, minItems = 1, maxItems = null}) {
        super({
            id,
            name,
            label,
            initial,
            widget,
            validators,
            attribs,
            description,
            options,
            order
        })

        // TODO: Sanity check min/max items

        this.minItems = minItems
        this.maxItems = maxItems
        this.itemSchema = items // schema to make new items
        this.itemOptions = options

        // We store the array fields in the slot
        this.slots = []

        for(let i in Array.from(Array(this.minItems).keys())) {
            this.addSlot(false)   
        }

        // Store errors as an object
        this.errors = {}
    }

    /**
    * Add a new slot to the array field
    * @param [updateWidget] Update the widget attached to the field
    */
    addSlot(updateWidget = true) {
        let position = this.slots.length + 1
        let fieldId = `${this.id}_item_${position}`
        let fieldName = `${this.name}_${position}`

        // FIXME: This is a workaround, really should
        // get the correct option structure to this class
        let fieldOptions = Object.assign({
            order: position
        }, this.itemOptions)

        let field = this.constructor.new(
            fieldId,
            fieldName,
            this.itemSchema,
            fieldOptions,
            this // parent
        )

        this.slots.push(field)

        if(updateWidget) {
            this.widget.addSlot(field)
        }
    }

    /**
    * Remove slot
    * @param [updateWidget] Update the widget attached to the field
    * @returns {bool} success of the removal of a slot
    */
    removeSlot(updateWidget = true) {
        if(this.slots.length === 0) {
            return false
        }

        this.slots.pop()

        if(updateWidget) {
            this.widget.removeSlot()
        }

        return true
    }

    /**
    * Property - get/set value
    */
    get value() {
        let valueArray = []

        for(let slot of this.slots) {
            valueArray.push(slot.value)
        }

        return valueArray
    }

    set value(value) {
        if(!Array.isArray(value)) {
            throw new Error('Unable to set array field value(s) from non-array!')
        }

        let fieldValueMap = this.slots.map(function(field, index) {
            return [field, value[index]]
        })

        for(let [field, value] of fieldValueMap) {
            field.value = value
        }
    }

    /**
    * Validate the form field
    * @returns {bool} returns sucess or failure of validation
    */
    validate() {
        let valid = true

        for(let field of this.slots) {
            if(!field.validate()) {
                this._errors[field.name] = field.errors
                valid = false
            }
        }
        return valid
    }

    /**
    * Refresh the validation state
    */
    refreshValidationState() {
        super.refreshValidationState()
        this._errors = {}
    }

    /**
    * Triggers post render call on all fields in array
    */
    postRender() {
        for(let field of this.slots) {
            field.postRender()
        }
    }

    /**
    *
    */
    getWidget() {
        return ArrayInput
    }

    /**
    *
    */
    render() {
        return this.widget.renderList(this.slots)
    }

    /**
    *
    */
    getFieldByPath(path) {
        let pathParts = path.split('.')

        // It's expected that the search name is an integer as
        // it should be an index to an field in the array
        let searchIndex = parseInt(pathParts.shift())

        if(isNaN(searchIndex)) {
            return null
        } else if(searchIndex > this.slots.length) {
            return null
        }

        let field = this.slots[searchIndex]

        if(pathParts.length === 0) {
            return field
        }

        if(field.constructor.prototype.hasOwnProperty('getFieldByPath')) {
            return field.getFieldByPath(pathParts.join('.'))
        }

        return null
    }

    /**
    * Property - get/set errors
    * @param {string} Error string
    */
    get errors() {
        return this._errors
    }

    set errors(error) {
        this._errors = error
    }
}

MuttRegistry.registerField('array', ArrayField)
