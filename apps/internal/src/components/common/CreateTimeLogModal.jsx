import { useEffect, useState } from "react";
import dayjs from "dayjs";
import PopupModal from "@orion/shared/src/components/PopupModal";
import SelectDropDown from "@orion/shared/src/components/SelectDropDown";
import { useToast } from "@orion/shared";
import { calendarBlank, clockDark, TimerIcon } from "../../assets/images";
import {
  getKimaiProjects,
  getKimaiActivities,
  getKimaiTags,
  getKimaiLastTimesheet,
  createKimaiTimesheet,
} from "../../services";

const KIMAI_DATETIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";

const isKimaiAuthError = (err) =>
  err?.code === "KIMAI_NOT_CONNECTED" ||
  err?.response?.status === 401 ||
  err?.response?.status === 403;

/** "1:30" -> 90. Returns null for anything unparsable. */
const parseDurationToMinutes = (text) => {
  const match = /^(\d+):([0-5]?\d)$/.exec((text || "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** 90 -> "1:30" */
const formatMinutesAsDuration = (totalMinutes) => {
  const minutes = Math.max(0, Math.round(totalMinutes));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/**
 * Logs time against a Kanban card/task into Kimai (POST /api/timesheets),
 * using the caller's own Kimai identity (see ConnectKimaiModal / kimaiCredentials.js).
 *
 * Field layout mirrors Kimai's own "Create" timesheet form: separate date +
 * time inputs for From, and a duration/end-time pair for Duration/End that
 * stay in sync with each other, the same way Kimai's own UI behaves.
 */
const CreateTimeLogModal = ({
  show,
  onClose,
  ticketData,
  toolSelected,
  onNeedReconnect,
  isTask,
}) => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedProject, setSelectedProject] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState([]);

  const now = () => dayjs().second(0).millisecond(0);
  const [beginDate, setBeginDate] = useState(now().format("YYYY-MM-DD"));
  const [beginTime, setBeginTime] = useState(now().format("HH:mm"));
  const [durationText, setDurationText] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const getBeginDateTime = () => dayjs(`${beginDate} ${beginTime}`, "YYYY-MM-DD HH:mm");

  /** End as a dayjs instant, rolling over to the next day if the end clock time is earlier than begin's. */
  const getEndDateTime = () => {
    if (!endTime) return null;
    const begin = getBeginDateTime();
    let end = dayjs(`${beginDate} ${endTime}`, "YYYY-MM-DD HH:mm");
    if (end.isBefore(begin)) {
      end = end.add(1, "day");
    }
    return end;
  };

  const resetForm = () => {
    setSelectedProject([]);
    setSelectedActivity([]);
    setActivities([]);
    setBeginDate(now().format("YYYY-MM-DD"));
    setBeginTime(now().format("HH:mm"));
    setDurationText("");
    setEndTime("");
    setDescription("");
    setSelectedTags([]);
  };

  useEffect(() => {
    if (!show) return;
    const ticketName =
      ticketData?.companyName ?? ticketData?.taskName ?? ticketData?.title ?? "";

    const toolNames = toolSelected
      ?.map((tool) => tool?.toolName)
      .filter(Boolean)
      .join(", ");

    setDescription(
      `Ticket Name: (${ticketData?.orderId ?? ""}) - ${ticketName}${
        toolNames ? `\n\n${isTask ? "Task: " : "Tool: "}${toolNames}` : ""
      }`,
    );

    // Default From to right after the user's last logged entry ends, like
    // Kimai's own "Create" form does - falls back to "now" (set here fresh,
    // since the initial useState default only reflects when this component
    // first mounted, not when it was actually reopened).
    const freshNow = now();
    setBeginDate(freshNow.format("YYYY-MM-DD"));
    setBeginTime(freshNow.format("HH:mm"));
    getKimaiLastTimesheet()
      .then((res) => {
        const lastEnd = Array.isArray(res?.data) ? res.data[0]?.end : null;
        if (!lastEnd) return;
        const lastEndMoment = dayjs(lastEnd);
        // if (lastEndMoment.isValid()) {
          // setBeginDate(lastEndMoment.format("YYYY-MM-DD"));
          // setBeginTime(lastEndMoment.format("HH:mm"));
        // }
      })
      .catch(() => {
        // Non-fatal - the "now" default set above already stands.
      });

    setProjectsLoading(true);
    getKimaiProjects()
      .then((res) => setProjects(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => {
        if (isKimaiAuthError(err)) {
          onNeedReconnect?.();
        } else {
          showToast({ message: "Failed to load Kimai projects", variant: "danger" });
        }
      })
      .finally(() => setProjectsLoading(false));

    getKimaiTags()
      .then((res) => setAvailableTags(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {
        // Tags are optional - fall back to a plain empty list rather than blocking the form.
        setAvailableTags([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    const projectId = selectedProject?.[0]?.id;
    setSelectedActivity([]);
    if (!projectId) {
      setActivities([]);
      return;
    }
    getKimaiActivities(projectId)
      .then((res) => setActivities(Array.isArray(res?.data) ? res.data : []))
      .catch(() =>
        showToast({ message: "Failed to load Kimai activities", variant: "danger" }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBeginDateChange = (value) => {
    setBeginDate(value);
    // Duration is relative to From, so keep it and just move End along with it.
    const minutes = parseDurationToMinutes(durationText);
    if (minutes != null) {
      setEndTime(
        dayjs(`${value} ${beginTime}`, "YYYY-MM-DD HH:mm")
          .add(minutes, "minute")
          .format("HH:mm"),
      );
    }
  };

  const handleBeginTimeChange = (value) => {
    setBeginTime(value);
    const minutes = parseDurationToMinutes(durationText);
    if (minutes != null) {
      setEndTime(
        dayjs(`${beginDate} ${value}`, "YYYY-MM-DD HH:mm")
          .add(minutes, "minute")
          .format("HH:mm"),
      );
    }
  };

  const handleDurationChange = (value) => {
    setDurationText(value);
    const minutes = parseDurationToMinutes(value);
    if (minutes != null) {
      setEndTime(getBeginDateTime().add(minutes, "minute").format("HH:mm"));
    }
  };

  const handleEndTimeChange = (value) => {
    setEndTime(value);
    if (!value) {
      setDurationText("");
      return;
    }
    const begin = getBeginDateTime();
    let end = dayjs(`${beginDate} ${value}`, "YYYY-MM-DD HH:mm");
    if (end.isBefore(begin)) {
      end = end.add(1, "day");
    }
    setDurationText(formatMinutesAsDuration(end.diff(begin, "minute")));
  };

  const handleSave = async () => {
    const begin = getBeginDateTime();
    if (!begin.isValid() || !selectedProject?.[0]?.id || !selectedActivity?.[0]?.id)
      return;

    setApiLoading(true);
    try {
      const payload = {
        begin: begin.format(KIMAI_DATETIME_FORMAT),
        project: selectedProject[0].id,
        activity: selectedActivity[0].id,
        description,
        tags: selectedTags.map((t) => t.name).join(","),
      };
      const end = getEndDateTime();
      if (end) {
        payload.end = end.format(KIMAI_DATETIME_FORMAT);
      }

      await createKimaiTimesheet(payload);
      showToast({ message: "Time logged successfully", variant: "success" });
      handleClose();
    } catch (err) {
      if (isKimaiAuthError(err)) {
        showToast({
          message: "Kimai session invalid. Please reconnect your Kimai account.",
          variant: "danger",
        });
        onNeedReconnect?.();
      } else {
        showToast({
          message: err?.response?.data?.message || err?.message || "Failed to log time",
          variant: "danger",
        });
      }
    } finally {
      setApiLoading(false);
    }
  };

  const isSaveDisabled =
    apiLoading ||
    !beginDate ||
    !beginTime ||
    !selectedProject?.[0]?.id ||
    !selectedActivity?.[0]?.id;

  return (
    <PopupModal
      show={show}
      onClose={handleClose}
      header={true}
      title="Time Log"
      className="addAttachmentModal time-log-modal"
      customClassName="createTimeLogModal createNewTask"
    >
      <div className="formContainer">
        <div className="nameContainer">
          <label className="heading">
            From <span className="text-danger">*</span>
          </label>
          <div className="d-flex gap-2 mt-2 w-100">
            <div className="picker-date position-relative flex-grow-1 w-50">
              <img
                src={calendarBlank}
                alt=""
                width={16}
                className="position-absolute"
                style={{ left: 10, top: 12 }}
              />
              <input
                type="date"
                className="nameInput"
                style={{ paddingLeft: 34 }}
                value={beginDate}
                onChange={(e) => handleBeginDateChange(e.target.value)}
              />
            </div>
            <div className="picker-date position-relative flex-grow-1 w-50">
              <img
                src={clockDark}
                alt=""
                width={16}
                className="position-absolute"
                style={{ left: 10, top: 12 }}
              />
              <input
                type="time"
                className="nameInput"
                style={{ paddingLeft: 34 }}
                value={beginTime}
                onChange={(e) => handleBeginTimeChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="nameContainer mt-3">
          <label className="heading">Duration / End</label>
          <div className="d-flex gap-2 mt-2 w-100">
            <div className="picker-date position-relative flex-grow-1 w-50">
              <img
                src={TimerIcon}
                alt=""
                width={16}
                className="position-absolute"
                style={{ left: 10, top: 12 }}
              />
              <input
                type="text"
                placeholder="0:00"
                className="nameInput"
                style={{ paddingLeft: 34 }}
                value={durationText}
                onChange={(e) => handleDurationChange(e.target.value)}
              />
            </div>
            <div className="picker-date position-relative flex-grow-1 w-50">
              <img
                src={clockDark}
                alt=""
                width={16}
                className="position-absolute"
                style={{ left: 10, top: 12 }}
              />
              <input
                type="time"
                placeholder="h:mm"
                className="nameInput"
                style={{ paddingLeft: 34 }}
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="nameContainer mt-3">
          <label className="heading">
            Project <span className="text-danger">*</span>
          </label>
          <SelectDropDown
            options={projects}
            labelField="name"
            valueField="id"
            values={selectedProject}
            onChange={(selected) => setSelectedProject(selected)}
            placeholder={projectsLoading ? "Loading projects..." : "Select project"}
            className="filter-select-dropDown"
            disabled={projectsLoading || apiLoading}
          />
        </div>

        <div className="nameContainer mt-3">
          <label className="heading">
            Activity <span className="text-danger">*</span>
          </label>
          <SelectDropDown
            options={activities}
            labelField="name"
            valueField="id"
            values={selectedActivity}
            onChange={(selected) => setSelectedActivity(selected)}
            placeholder={
              selectedProject?.[0]?.id ? "Select activity" : "Select a project first"
            }
            className="filter-select-dropDown"
            disabled={!selectedProject?.[0]?.id || apiLoading}
          />
        </div>

        <div className="nameContainer mt-3">
          <label className="heading">Description</label>
          <textarea
            className="nameInput mt-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="nameContainer mt-3">
          <label className="heading">Tags</label>
          <SelectDropDown
            multi={true}
            options={availableTags}
            labelField="name"
            valueField="id"
            colorField="colorSafe"
            values={selectedTags}
            onChange={(selected) => setSelectedTags(selected)}
            placeholder="Select tags"
            className="filter-select-dropDown"
            disabled={apiLoading}
            optionType="checkbox"
            dropdownPosition="auto"
          />
        </div>
      </div>
      <div className="d-flex flex-row align-items-center justify-content-end footerContainer">
        <button
          className="btn btn-0 createTaskSubmitBtn d-flex align-items-center justify-content-center px-4"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          {apiLoading ? "Saving..." : "Save"}
        </button>
        <button
          className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-4"
          onClick={handleClose}
          disabled={apiLoading}
        >
          Close
        </button>
      </div>
    </PopupModal>
  );
};

export default CreateTimeLogModal;
