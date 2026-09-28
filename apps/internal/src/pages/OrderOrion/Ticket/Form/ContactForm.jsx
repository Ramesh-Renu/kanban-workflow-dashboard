import appConstants from "../../../../constant/common";
import useDynamicOtherData from "../../../../hooks/useDynamicOtherData";
import { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import ContactFormField from "./ContactFormField";
import DynamicField from "../../../../components/common/Dynamic/DynamicField";

const ContactForm = ({ ...props }) => {
  /** VARIABLE DECLARATION */
  const primaryInputFields = [
    {
      label: "Full Name",
      placeholder: "Full Name",
      key: "fullName",
      type: "input",
    },
    {
      label: "",
      placeholder: "+91",
      key: "dialCode",
      classNames: "countryCode",
      type: "dialCode",
    },
    {
      label: "Phone Number",
      placeholder: "Enter Mobile Number",
      key: "phoneNumber",
      type: "phoneNumber",
    },
    {
      label: "Email ID",
      placeholder: "Enter Email ID",
      key: "emailID",
      type: "input",
    },
    {
      label: "Designation",
      placeholder: "Enter Designation",
      key: "designation",
      type: "input",
    },
  ];
  const secondaryInputFields = [...primaryInputFields];
  const [primaryFormValid, setPrimaryFormValid] = useState({
    emailID: "",
    phoneNumber: "",
  });
  const [secondaryFormValid, setSecondaryFormValid] = useState({
    emailID: "",
    phoneNumber: "",
  });
  const [primaryContactFormData, setPrimaryContactFormData] = useState({
    fullName: "",
    dialCode: [],
    phoneNumber: "",
    emailID: "",
    designation: "",
    otherData: [{ fieldName: "New field", fieldValue: "", id: 1 }],
  });
  const [secondaryContactFormData, setSecondaryContactFormData] = useState({
    fullName: "",
    dialCode: [],
    phoneNumber: "",
    emailID: "",
    designation: "",
  });

  const {
    otherData: primaryOtherData,
    handleAddField: primaryHandleAddField,
    handleRemoveField: primaryHandleRemoveField,
    updateFieldData: primaryUpdateFieldData,
  } = useDynamicOtherData(primaryContactFormData.otherData, (updatedData) =>
    setPrimaryContactFormData((prev) => ({ ...prev, otherData: updatedData }))
  );
  useEffect(() => {
    const primary = props?.formData?.contactForm?.primaryContact;
    const secondary = props?.formData?.contactForm?.secondaryContact;

    // Normalize and match primary dialCode
    const primaryDialCodeIds = Array.isArray(primary?.dialCode)
      ? primary.dialCode
      : [primary?.dialCode];

    const primaryDialCodeObjects = props?.countryList?.filter((code) =>
      primaryDialCodeIds.includes(code.country_id)
    );

    // Normalize and match secondary dialCode
    const secondaryDialCodeIds = Array.isArray(secondary?.dialCode)
      ? secondary.dialCode
      : [secondary?.dialCode];

    const secondaryDialCodeObjects = props?.countryList?.filter((code) =>
      secondaryDialCodeIds.includes(code.country_id)
    );

    // Update contact form data separately.
    // Preserve a usable otherData default when API sends otherData: [] (e.g. order 321).
    setPrimaryContactFormData((prev) => ({
      ...primary,
      dialCode: primaryDialCodeObjects,
      otherData:
        Array.isArray(primary?.otherData) && primary.otherData.length > 0
          ? primary.otherData
          : prev.otherData?.length > 0
            ? prev.otherData
            : [{ fieldName: "New field", fieldValue: "", id: 1 }],
    }));

    setSecondaryContactFormData({
      ...secondary,
      dialCode: secondaryDialCodeObjects,
    });
  }, []);

  const emailIDCheck = (value) => {
    return value.length > 5
      ? !new RegExp(appConstants.VALIDATION_PATTERNS.email).test(value)
      : false;
  };
  const phoneNumberCheck = (value) => {
    return value.length > 0
      ? !new RegExp(appConstants.VALIDATION_PATTERNS.phonenumberHyphens).test(
          value
        )
      : false;
  };

  /** UPDATE PRIMARY CONTACT FORM */
  const handlePrimaryChange = (value, key) => {
    const updated = { ...primaryContactFormData, [key]: value };
    setPrimaryContactFormData(updated);
    setPrimaryFormValid((prev) => {
      const updatedErrors = { ...prev };
      if (key === "emailID") {
        updatedErrors.emailID = emailIDCheck(value)
          ? "Enter valid email ID"
          : "";
      }
      if (key === "phoneNumber") {
        updatedErrors.phoneNumber = phoneNumberCheck(value)
          ? "Enter digit only"
          : "";
      }
      return updatedErrors;
    });
    props?.setFormData?.((prev) => ({
      ...prev,
      contactForm: {
        ...prev.contactForm,
        primaryContact: {
          ...prev.contactForm.primaryContact,
          [key]:
            key === "dialCode"
              ? value?.map((item) => item.country_id) || []
              : value,
        },
      },
    }));
  };

  useEffect(() => {
    props?.setFormData?.((prev) => {
      if (prev?.contactForm?.primaryContact?.otherData === primaryOtherData) {
        return prev;
      }
      return {
        ...prev,
        contactForm: {
          ...prev.contactForm,
          primaryContact: {
            ...prev.contactForm?.primaryContact,
            otherData: primaryOtherData,
          },
        },
      };
    });
  }, [primaryOtherData]);

  /** UPDATE SECONDARY CONTACT FORM */
  const handleSecondaryChange = (value, key) => {
    const updated = { ...secondaryContactFormData, [key]: value };
    setSecondaryContactFormData(updated);
    setSecondaryFormValid((prev) => {
      const updatedErrors = { ...prev };
      if (key === "emailID") {
        updatedErrors.emailID = emailIDCheck(value)
          ? "Enter valid email ID"
          : "";
      }
      if (key === "phoneNumber") {
        updatedErrors.phoneNumber = phoneNumberCheck(value)
          ? "Enter digit only"
          : "";
      }
      return updatedErrors;
    });

    props?.setFormData?.((prev) => ({
      ...prev,
      contactForm: {
        ...prev.contactForm,
        secondaryContact: {
          ...prev.contactForm?.secondaryContact,
          [key]:
            key === "dialCode"
              ? value?.map((item) => item.country_id) || []
              : value,
        },
      }, //secondaryContactForm: updated
    }));
  };

  return (
    <Row className="contact-info mt-5">
      <Col xs={12} className="contact-info-header">
        <h5 className="mb-1">Contact Info</h5>
        <span className="fs-12 p">Add primary and secondary contacts</span>
      </Col>

      {/* Primary Contact */}

      <Row className="w-100 form-group d-flex flex-wrap align-items-baseline justify-content-flex-start  contact-info-form ">
        <h6 className="fw-bold mt-3 pb-0 m-0">Primary Contact</h6>
        <ContactFormField
          fields={primaryInputFields}
          formData={primaryContactFormData}
          handleChange={handlePrimaryChange}
          className={`input-group-renderer-default-style`}
          errors={primaryFormValid}
          countryList={props.countryList}
        ></ContactFormField>
        {primaryOtherData?.map((inp, i) => (
          <Col lg={4} md={4} xs={10} className="" key={inp.id}>
            <DynamicField
              format={""}
              getData={{
                removeBtn: primaryOtherData.length > 1,
                addBtn: primaryOtherData.length === i + 1,
                labelClassName: `label`,
                fieldName: inp.fieldName,
                fieldValue: inp.fieldValue,
                getId: inp.id,
                index: i,
                disabled: inp.disabled,
              }}
              setIsClicked={() => {}}
              fieldAdd={primaryHandleAddField}
              fieldRemove={() => primaryHandleRemoveField(inp.id)}
              updateFieldData={(type, id, name, val) =>
                primaryUpdateFieldData(id, name, val)
              }
              type={"otherData"}
              extraFlag={true}
            />
          </Col>
        ))}
      </Row>
      {/* Secondary Contact */}
      <Row className="w-100 form-group d-flex flex-wrap align-items-baseline justify-content-flex-start row  contact-info-form">
        <h6 className="fw-bold m-0 mt-2">Secondary Contact</h6>
        <ContactFormField
          fields={secondaryInputFields}
          formData={secondaryContactFormData}
          handleChange={handleSecondaryChange}
          className={`input-group-renderer-default-style`}
          errors={secondaryFormValid}
          countryList={props.countryList}
        ></ContactFormField>
      </Row>
    </Row>
  );
};

export default ContactForm;
