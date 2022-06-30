/** validator.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Contains functions that validate data
 */
// Databse
// import DbCategories from '../database/dbCategories';
// import categoryCollection from '../database/dbCategories';

export default class Validator {
  /** validateAmount
   * Checks if a given amount is a number and rounds it to 2 digits
   *
   * @param {string} amount
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns rounded: Rounded amount to 2 decimal places
   */
  static validateAmount = (amount: string): { valid: boolean; errors: any; rounded: number } => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    const amountNum = parseFloat(amount.toString());

    if (isNaN(amountNum)) {
      errors.amount = 'Amount is not a number';
    }
    const rounded = Math.round((amountNum + Number.EPSILON) * 100);

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      rounded,
    };
  };

  /** validateConcept
   * Checks if a given concept is valid
   *
   * @param {string} amount
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static validateConcept = (concept: string): { valid: boolean; errors: any; trimmed: string } => {
    const errors: any = {};

    if (concept === null) errors.concept = 'Concept must not be empty';
    else if (concept.trim() === '') errors.concept = 'Concept must not be empty';

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      trimmed: concept.trim()
    };
  };

  /** validateDate
   * Checks that a given date is in the YYYY-MM-DD format
   *
   * @param {string} date
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static validateDate = (date: string): { valid: boolean; errors: any } => {
    const errors: any = {};

    const formatRegex = /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])/;
    if (!formatRegex.test(date)) {
      errors.date = 'The date must be in YYYY-MM-DD format';
    } else {
      // Checks if it is a valid date
      const splitDate = date.split('-');
      let day;
      let year;

      // Checks the month-date
      switch (splitDate[1]) {
        case '02':
          day = parseInt(splitDate[2], 10);

          if (day > 29) {
            errors.date = 'Invalid date';
          } else if (day === 29) {
            year = parseInt(splitDate[0], 10);

            if (!(year % 400 === 0 || (year % 4 === 0 && !(year % 100 === 0)))) {
              errors.date = 'Invalid date';
            }
          }

          break;
        case '04':
        case '06':
        case '09':
        case '11':
          if (splitDate[2] === '31') {
            errors.date = 'Invalid date';
          }
          break;
        default:
        // Regex already filtered invalid dates
      }
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
    };
  };

  /** validateLoaner
   *  Checks if the a given loaner string is valid
   *
   * @param {string} text
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns trimmed: String trimmed and formatted
   */
  static validateLoaner = (loaner: string): { valid: boolean; errors: any; trimmed: string } => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    if (loaner === null) errors.loaner = 'Loaner cannot be noone';
    else if (loaner.trim() === '') errors.loaner = 'Loaner cannot be empty';

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      trimmed: loaner.trim(),
    };
  };
}
