import { useState } from "react";
import PopupModal from "@orion/shared/src/components/PopupModal";
import { useToast } from "@orion/shared";
import {
  saveKimaiCredentials,
  clearKimaiCredentials,
} from "@orion/shared/src/utils/kimaiCredentials";
import { setActiveKimaiCredentials } from "@orion/shared/src/services/orionTimeTracking";
import { getKimaiProjects } from "../../services";
import { kimaiApiTokenCreate, kimaiApiTokenPage, kimaiApiTokenPassword } from "../../assets/images";

/**
 * One-time per-user Kimai account connect. Kimai's web login can use Azure
 * AD SSO, but that's a browser session cookie its API firewall doesn't
 * accept - each Orion user pairs their own Kimai API Token (Profile -> API
 * Access -> "+ Create") so time logs are attributed to the right person.
 */
const ConnectKimaiModal = ({ show, onClose, userName, onConnected }) => {
  const { showToast } = useToast();
  const [kimaiToken, setKimaiToken] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setKimaiToken("");
    setError("");
    onClose();
  };

  const handleConnect = async () => {
    if (!kimaiToken.trim()) {
      setError("Enter your Kimai API Token.");
      return;
    }

    setApiLoading(true);
    setError("");

    const creds = { token: kimaiToken.trim() };

    // Validate against Kimai before persisting, so a typo doesn't get saved.
    setActiveKimaiCredentials(creds);
    try {
      await getKimaiProjects();
      saveKimaiCredentials(userName, creds);
      showToast({ message: "Kimai account connected", variant: "success" });
      setKimaiToken("");
      onConnected?.();
    } catch (err) {
      setActiveKimaiCredentials(null);
      clearKimaiCredentials(userName);
      setError(
        err?.response?.data?.message ||
          "Could not connect to Kimai with this token. Check that it was copied correctly and hasn't expired.",
      );
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <PopupModal
      show={show}
      onClose={handleClose}
      header={true}
      title="Connect your Kimai account"
      className="addAttachmentModal createNewTaskModal"
      customClassName="createNewTask connectKimaiModal"
    >
      <div className="formContainer">
        <p className="text-muted">
          In Kimai, open your profile (click your avatar, top right) &rarr;
          the <strong>API Access</strong> tab &rarr; click{" "}
          <strong>+ Create</strong> to generate a new API Token. Paste it
          below. It's stored only in your browser and used to attribute time
          logs to your Kimai account.
        </p>
        <div className="d-flex flex-column align-items-center justify-content-center gap-2">

        <img src={kimaiApiTokenPage} alt="kimaiApiTokenPage" style={{width: "100%", height: "100%"}}/>
        <img src={kimaiApiTokenCreate} alt="kimaiApiTokenCreate" style={{width: "100%", height: "100%"}}/>
        <img src={kimaiApiTokenPassword} alt="kimaiApiTokenPassword" style={{width: "100%", height: "100%"}}/>
        </div>
        <p className="text-danger fs-14">
          This is <strong>not</strong> your Azure AD / company login
          password, and not the older "API password" section on that page
          (that one is deprecated) &mdash; use the <strong>API Token</strong>{" "}
          created via the + Create button.
        </p>
        <div className="nameContainer">
          <label className="heading">
            Kimai API Token <span className="text-danger">*</span>
          </label>
          <input
            type="password"
            placeholder="Paste the token generated on the Kimai API Access page"
            className="nameInput mt-2"
            value={kimaiToken}
            onChange={(e) => setKimaiToken(e.target.value)}
          />
        </div>
        {error && <p className="error-msg mt-2">{error}</p>}
      </div>
      <div className="d-flex flex-row align-items-center justify-content-end gap-2 footerContainer">
        <button
          className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-4"
          onClick={handleClose}
          disabled={apiLoading}
        >
          Close
        </button>
        <button
          className="btn btn-0 createTaskSubmitBtn d-flex align-items-center justify-content-center px-4"
          onClick={handleConnect}
          disabled={apiLoading || !kimaiToken.trim()}
        >
          {apiLoading ? "Connecting..." : "Connect"}
        </button>
      </div>
    </PopupModal>
  );
};

export default ConnectKimaiModal;
