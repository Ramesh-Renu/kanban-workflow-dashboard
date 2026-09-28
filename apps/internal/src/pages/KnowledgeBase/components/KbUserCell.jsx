import LogoAvatarShowLetter from "components/common/LogoAvatarShowLetter";
import { toKbUser } from "../utils";

/** Workflow management Created By cell (avatar + name, centered). */
export const renderKbUserCell = (userOrName, align = "center") => {
  const user = toKbUser(userOrName);
  return (
    <div className={`d-flex flex-row align-items-center justify-content-${align} gap-2`}>
      <div className="avatars m-0">
        {user && (
          <LogoAvatarShowLetter
            genaralData={user}
            profileName="name"
            outerClassName="avatars__item"
            innerClassName="avatars__img"
          />
        )}
      </div>
      <div className="d-flex flex-column truncate-2-lines align-items-baseline nameContainer">
        <span>{user?.name || "—"}</span>
      </div>
    </div>
  );
};

export { toKbUser };
