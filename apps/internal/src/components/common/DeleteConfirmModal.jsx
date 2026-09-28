import React from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { t } from "i18next";

const DeleteConfirmModal = ({ show, message, onClose, confirmDelete }) => (
  <PopupModal
    show={show}
    onClose={onClose}
    className="deleteConfirmModal"
  >
    <div className="deleteConfirmation">
      <div className="w-100 mx-auto">
        <h5 className="text-danger text-center">
          {t("settings.confirm_deletion")}
        </h5>
        <p className="text-center">
          {message}
        </p>
      </div>
      <div className="d-flex justify-content-center gap-3 delete_btn_rows">
        <button
          className="btn btn-0 yes_btn px-4 rounded"
          onClick={confirmDelete}
        >
          {t("common.yes")}
        </button>
        <button
          className="btn btn-0 no_btn px-4 rounded"
          onClick={onClose}
        >
          {t("common.no")}
        </button>
      </div>
    </div>
  </PopupModal>
);

export default DeleteConfirmModal;
