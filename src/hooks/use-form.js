"use client";
import { useState, useCallback } from "react";

/**
 * Custom hook for form state management and validation
 *
 * @param {Object} initialValues - Initial form values
 * @param {Function} validateFn - Validation function
 * @param {Function} onSubmit - Submission handler
 * @returns {Object} Form state and handlers
 */
export function useForm(initialValues, validateFn, onSubmit) {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  // Set a form field value directly
  const setField = useCallback((name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues]);

  // Validate form data
  const validate = useCallback(() => {
    if (!validateFn) return true;

    const newErrors = validateFn(formData);
    setErrors(newErrors || {});
    return Object.keys(newErrors || {}).length === 0;
  }, [formData, validateFn]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();

      if (!validate()) return false;

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        resetForm();
        return true;
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          submit: error.message || "An error occurred",
        }));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, resetForm, validate]
  );

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    setField,
    resetForm,
    validate,
    handleSubmit,
    setErrors,
    setFormData,
  };
}
