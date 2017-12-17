const formFieldTags = ['input'];                    // as needed add more tags here, e.g. select, textarea, etc.
const formFieldTypeBlacklist = ['submit', 'reset']  // add more as needed

function _validateFormField(formField) {
  return !formFieldTypeBlacklist.includes(formField.type) && formField.name.length > 0;
}

/**
 * Given a form selector, returns all values of input elements as a JS object.
 * Expects the "name" attribute to be set on form fields.
 *
 * Just a quickly thrown together helper, won't take into consideration nested form fields and
 * potential collisions on the "name" property.
 */
function gatherFormData(formSelector) {
  let formFields = [];

  formFieldTags.forEach((tag) => {
    formFields = formFields.concat(Array.from(document.querySelectorAll(`${formSelector} ${tag}`)));
  });

  const formData = {};
  formFields.forEach((ele) => {
    if (_validateFormField(ele)) {
      formData[ele.name] = ele.value;
    }
  });

  return formData;
}

export { gatherFormData };