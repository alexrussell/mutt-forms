/**
* @file A simple HTML form interface, with a squishy face.
* @version 0.0.1
* @author Nick Snell <nick@boughtbymany.com>
* @copyright Bought By Many 2016
*/

'use strict'

import {Fieldset} from './fieldsets/core'

import * as fields from './fields'
import * as widgets from './widgets'
import * as validators from './validators'
import * as utils from './utils'
import MuttRegistry from './registry'

export {fields, widgets, validators, utils, MuttRegistry}

/**
* Main Mutt form interface. This instance is used to build,
* control & render the form
* @class
*/
export default class Mutt {

    /**
    * Initialisation of a Mutt form
    * @constructor
    * @param {HTMLElement} container Containing element for the Mutt Form
    * @param {object} schema JSON Schema containing Form & Field Configuration
    * @param {object} [options={}] form configuration options
    * @param {function} [callback=null] callback function for form submission
    * @param {boolean} [debug=false] debugging flag
    */
    constructor(container, schema, options = {}, callback = null,
        debug = false) {
        if(container === null) {
            throw new Error(
                'You must pass a valid container to create a Mutt form!'
            )
        }

        this.container = container
        this.multipart = false
        this.callback = callback
        this.id = null
        this.debug = debug
        this.locked = false

        this.form = null
        this.fieldsets = []
        this.options = {}
        this.buttons = {submit: null}

        if(options && options.hasOwnProperty('form')) {
            this.options = options.form
        }

        // Build the form from the config
        this.build(schema, options)
    }

    /**
    * Build the form fieldsets from the config. The default is
    * always to use one, however groups can be specified in the
    * from options
    * @param {object} schema JSON schema of form
    * @param {object} [options=null] options object for the form
    */
    build(schema, options = null) {
        // TODO: Allow build options override

        // If fieldsets is specfied in the form options we are
        // going to attempt to build multiple ones
        if(options.hasOwnProperty('fieldsets')) {
            let fieldsetIndex = 0

            for(let fieldsetSpec of options.fieldsets) {
                let fieldsetFields = null
                let fieldsetLabel = null

                if(fieldsetSpec.hasOwnProperty('fields')) {
                    fieldsetFields = fieldsetSpec.fields
                }

                if(fieldsetSpec.hasOwnProperty('fieldsets')) {
                    options.fieldsets = fieldsetSpec.fieldsets
                }

                if(fieldsetSpec.options &&
                    fieldsetSpec.options.hasOwnProperty('label')) {
                    fieldsetLabel = fieldsetSpec.options.label
                }

                let fieldset = Fieldset.new(
                    schema,
                    options,
                    fieldsetFields,
                    `mutt-fieldset-${fieldsetIndex}`,
                    fieldsetLabel
                )

                this.fieldsets.push(fieldset)
                fieldsetIndex++
            }
        } else {
            let fieldset = Fieldset.new(schema, options)
            this.fieldsets.push(fieldset)
        }
    }

    /**
    * Get the data from the form - this can be returned as a list
    * of objects, each object being a fieldsets data set. Or, by
    * default, as a merged object of all the data
    * @param {bool} [asList] Boolean to indicate if a list of fieldset
    * data is required. Default is to return a merged object.
    * @returns {object} key/value data object for the form
    */
    data(asList = false) {
        if(asList) {
            let data = []

            for(let fieldset of this.fieldsets) {
                data.push(fieldset.data())
            }

            return data
        }

        let data = {}

        for(let fieldset of this.fieldsets) {
            data = Object.assign(data, fieldset.data())
        }

        return data
    }

    /**
    * Populate the form field with selected values
    * @param {object} data Data object with form values
    */
    populate(data) {
        for(let fieldset of this.fieldsets) {
            fieldset.populate(data)
        }
    }

    /**
    * Render the form
    * @returns {Promise} a promise to be resolved once rendering
    * is complete
    */
    render() {
        return new Promise((resolve, reject) => {
            let formContainer = document.createDocumentFragment()
            this.form = document.createElement('form')

            if(this.id) {
                this.form.setAttribute('id', this.id)
            }

            this.form.setAttribute('method', 'POST')
            this.form.setAttribute('action', '')
            this.form.setAttribute('class', 'mutt-form')

            if(this.multipart) {
                this.form.setAttribute('enctype', 'multipart/form-data')
            }

            for(let fieldset of this.fieldsets) {
                let fieldsetElement = fieldset.render()
                this.form.appendChild(fieldsetElement)
            }

            // Add form controls
            let buttonClass = 'mutt-button'
            let buttonText = 'Submit'

            // Check for button overide options
            if(this.options.hasOwnProperty('buttons')) {
                if(this.options.buttons.hasOwnProperty('submit')) {
                    if(this.options.buttons.submit.hasOwnProperty('class')) {
                        buttonClass = buttonClass + ' ' + this.options.buttons.submit.class
                    }

                    if(this.options.buttons.submit.hasOwnProperty('text')) {
                        buttonText = this.options.buttons.submit.text
                    }
                }
            }

            let buttonWrapper = document.createElement('div')
            buttonWrapper.setAttribute('class', 'mutt-button-wrapper')

            // Add any aditional buttons specified in the options
            if(this.options.hasOwnProperty('buttons')) {
                for(let buttonName of Object.keys(this.options.buttons)) {
                    if(buttonName == 'submit') {
                        // We always default this
                        continue
                    }

                    let buttonSpec = this.options.buttons[buttonName]

                    // Setup a new button
                    let button = document.createElement('button')
                    button.setAttribute('name', buttonName)
                    button.setAttribute('class', buttonSpec.class)
                    button.setAttribute('type', 'button')
                    button.textContent = buttonSpec.text
                    button.onclick = buttonSpec.callback

                    this.buttons[buttonName] = button

                    buttonWrapper.appendChild(button)
                }
            }

            let submitButton = document.createElement('button')
            submitButton.setAttribute('class', buttonClass)
            submitButton.setAttribute('type', 'submit')
            submitButton.textContent = buttonText
            submitButton.onclick = (e) => {
                this.submit(e)
                return false
            }

            this.buttons.submit = submitButton
            buttonWrapper.appendChild(submitButton)

            this.form.appendChild(buttonWrapper)

            // Build the form and render to the viewport
            formContainer.appendChild(this.form)
            this.container.appendChild(formContainer)

            // Form has been renderd to the stage, call
            // the post render hooks
            for(let fieldset of this.fieldsets) {
                fieldset.postRender()
            }

            resolve(this)
        })
    }

    /**
    * Remove the form from the stage
    */
    destroy() {
        let form = this.container.querySelector('form')
        this.container.removeChild(form)
    }

    /**
    * Validate the form
    * @returns {bool} response to the validation request
    */
    validate() {
        let valid = true
        let errors = []

        for(let fieldset of this.fieldsets) {
            if(!fieldset.validate()) {
                errors.push(fieldset.errors)
                valid = false
            }
        }

        this.log(
            `Validation Complete -> Status: ${valid} -> ${JSON.stringify(errors)}`
        )

        return valid
    }

    /**
    * Redraw all of the error states on the stage
    */
    refreshValidationState() {
        for(let fieldset of this.fieldsets) {
            fieldset.refreshValidationState()
        }
    }

    /**
    * Submit handler for the form
    * @param {Event} event Event triggering the submission
    * @returns {bool} success or failure of submission
    */
    submit(event) {
        // We always validate prior to validateion
        let valid = false

        try {
            valid = this.validate()
        } catch (e) {
            this.log('Unable to validate prior to submit!', e)
            return false
        }

        if(valid) {
            this.log('Submit form')

            if(this.callback) {
                this.callback(this.data(), event)
            } else {
                this.form.submit()
            }

            return true
        }

        return false
    }

    /**
    * Lock a form, this changes all of the fields to a read only state
    */
    lock() {
        this.log('Locking form')

        for(let fieldset of this.fieldsets) {
            fieldset.lock()
        }
    }

    /**
    * Unlock a form, this can be used to restore a locked form to it's
    * editable state
    */
    unlock() {
        this.log('Unlocking form')

        for(let fieldset of this.fieldsets) {
            fieldset.unlock()
        }
    }

    /**
    * Set the ID for the form - this is used for rendering
    * @param {string} formId ID for a form
    */
    setFormId(formId) {
        this.id = formId
    }

    /**
    * Set the callback for the submission
    * @param {function} callback Callback function for form submission
    */
    setSubmitCallback(callback) {
        this.callback = callback
    }

    /**
    * Get the form ID
    * @returns {string} ID for a form
    */
    getFormId() {
        return this.id
    }

    /**
    * Set field errors in bulk, this is typically used to
    * show errors from a server side response
    * @param {object} errors a hash of errors
    */
    setFieldErrors(errors) {
        // TODO: Known limitation. Errors are not provided
        // in a hierarchical manner. Just as key/value - so
        // duplicate keys scoped by parent objects are not
        // supported. Errors are added to both fields in this
        // instance.
        for(let fieldset of this.fieldsets) {
            fieldset.setFieldErrors(errors)
        }
    }

    /**
    * Get a field in the form by it's path. Paths should be
    * provided in 'dot' notation - i.e "some.example.path"
    * @param {string} path path to the field using dot notation
    */
    getFieldByPath(path) {
        // To find a field we need to inspect each fieldset
        for(let fieldset of this.fieldsets) {
            let field = fieldset.getFieldByPath(path)

            if(field) {
                return field
            }
        }
    }

    /**
    * Log a message
    * @param {string} message Message to log
    */
    log(message) {
        if(this.debug) {
            window.console.log('Mutt ->', message)
        }
    }
}
