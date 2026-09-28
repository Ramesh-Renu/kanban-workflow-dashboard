import AccessImage from "../../assets/images/accessRequired.svg";

const DEFAULT_TITLE = "Access Required";
const DEFAULT_MESSAGE = "You don’t currently have permission to view Boards.";
const DEFAULT_HELP =
  "Kindly contact the Admin or Product team to get the required access and board permissions";

/**
 * Shared access-denied screen.
 * Call sites with no props keep the existing Boards messaging.
 */
const AccessRequired = ({
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  help = DEFAULT_HELP,
} = {}) => {
  return (
    <div className="not-found">
      <div className="not-found-content">
        <img src={AccessImage} alt="AccessImage" className="w-25" />
        <h2 className="error-message mt-3">{title}</h2>
        <p className="error-description-access">{message}</p>
        <p className="error-description-access">{help}</p>
      </div>
    </div>
  );
};

export default AccessRequired;
