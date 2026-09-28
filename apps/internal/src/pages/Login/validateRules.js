import omit from 'lodash/omit';
import appConstants from '../../constant/common';
let errors = {
  email: '',
  password: ''
};
export default function validateLogin(name, values) {

    /** EMAIL ID */
    const validateEmail = () => {
      if (!values.email || !new RegExp(appConstants.VALIDATION_PATTERNS.email).test(values.email)) {
        errors.email = "Invalid";
      }else{
        // errors.email = false;
        errors = omit(errors, "email");
      }
    }
    
    /** PASSWORD */
    const validatePassword = () => {
      if (!values.password) {
        errors.password = "Invalid";
      }else {
        // errors.password = false;
        errors = omit(errors, "password");
      }
    }

    if(name=="email"){
      validateEmail();
    }else if(name=="password"){
      validatePassword();
    }else{
      errors = {};
      validateEmail();
      validatePassword();
    }
        
    return errors;
};
