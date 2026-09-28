import { Fragment, useMemo, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { t } from "i18next";
import { useToast } from "@orion/shared";
import { classNames } from "@euroland/libs";
import { createColumnHelper } from "@tanstack/react-table";
import { pencilSimpleLine, trashFull } from "assets/images";
import Table from "../../../../../components/common/Table";
import DeleteConfirmModal from "../../../../../components/common/DeleteConfirmModal";
import { useGlobalContext } from "store/context/GlobalProvider";
import { addUpdateKnowledgeBase, deleteKnowledgeBase } from "services";
import CreateKnowledgeBaseModal from "./CreateKnowledgeBaseModal";
import { renderKbUserCell } from "pages/KnowledgeBase/components/KbUserCell";
import KbFilterInput from "pages/KnowledgeBase/components/KbFilterInput";
import useKnowledgeBase from "hooks/useKnowledgeBase";
import {
  formatDisplayDate,
  isKbApiSuccess,
  kbUserSearchText,
  matchesKbTextFilter,
  normalizeKnowledgeBase,
  todayStr,
} from "pages/KnowledgeBase/utils";

const STATE_KEY = "knowledgeBaseList";

const columnHelper = createColumnHelper();

const KnowledgeBaseMasters = () => {
  const { dispatch } = useGlobalContext();
  const { showToast } = useToast();
  const [
    { allRows: rows, loading },
    { getKnowledgeBaseList },
  ] = useKnowledgeBase();

  const [filterQuery, setFilterQuery] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingKb, setEditingKb] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const setKnowledgeBaseRows = (nextRows) => {
    dispatch({
      type: "SUCCESS",
      payload: {
        key: STATE_KEY,
        data: nextRows,
      },
    });
  };

  const filteredRows = useMemo(
    () =>
      rows.filter((kb) =>
        matchesKbTextFilter(
          filterQuery,
          kb.name,
          kb.description,
          kbUserSearchText(kb.createdBy),
        ),
      ),
    [rows, filterQuery],
  );

  const openCreate = () => {
    setEditingKb(null);
    setShowCreateModal(true);
  };

  const openEdit = (kb) => {
    setEditingKb(kb);
    setShowCreateModal(true);
  };

  const openDelete = (kb) => {
    setSelectedRow(kb);
    setShowDeleteModal(true);
  };

  const applyLocalCreate = (payload) => {
    const item = normalizeKnowledgeBase({
      id: `kb-local-${Date.now()}`,
      name: payload.name,
      description: payload.description,
      createdBy: { name: "Admin", displayName: "Admin" },
      createdDate: todayStr(),
    });
    setKnowledgeBaseRows([...rows, item]);
    return item;
  };

  const applyLocalUpdate = (payload) => {
    const nextRows = rows.map((kb) => {
      if (String(kb.id) !== String(payload.id)) return kb;
      return {
        ...kb,
        name: payload.name,
        description: payload.description,
      };
    });
    setKnowledgeBaseRows(nextRows);
    return nextRows.find((kb) => String(kb.id) === String(payload.id)) || null;
  };

  const applyLocalDelete = (id) => {
    setKnowledgeBaseRows(rows.filter((kb) => String(kb.id) !== String(id)));
  };

  const handleSaveKnowledgeBase = async ({ name, description, knowledgeBase }) => {
    const isEdit = Boolean(knowledgeBase?.id);
    const payload = isEdit
      ? { id: knowledgeBase.id, name, description }
      : { name, description };

    try {
      const response = await addUpdateKnowledgeBase(payload);

      if (!isKbApiSuccess(response)) {
        throw new Error(response?.message || t("settings.master_data.kb_save_failed"));
      }

      const saved = response?.data ? normalizeKnowledgeBase(response.data) : null;

      if (isEdit) {
        if (saved?.id) {
          setKnowledgeBaseRows(
            rows.map((kb) => (String(kb.id) === String(saved.id) ? saved : kb)),
          );
        } else {
          applyLocalUpdate(payload);
        }
      } else if (saved?.id) {
        setKnowledgeBaseRows([...rows, saved]);
      } else {
        await getKnowledgeBaseList({ force: true });
      }

      showToast({
        message:
          response?.message ||
          response?.data?.message ||
          (isEdit
            ? t("settings.master_data.kb_updated")
            : t("settings.master_data.kb_created")),
        variant: "success",
      });
    } catch {
      // API failed — apply insert/update in master store
      if (isEdit) {
        applyLocalUpdate(payload);
        showToast({
          message: t("settings.master_data.kb_updated"),
          variant: "success",
        });
      } else {
        applyLocalCreate(payload);
        showToast({
          message: t("settings.master_data.kb_created"),
          variant: "success",
        });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRow?.id) return;
    setDeleting(true);
    try {
      const response = await deleteKnowledgeBase({ id: selectedRow.id });
      if (!isKbApiSuccess(response)) {
        throw new Error(response?.message || t("settings.master_data.kb_delete_failed"));
      }
      applyLocalDelete(selectedRow.id);
      showToast({
        message:
          response?.message ||
          response?.data?.message ||
          t("settings.master_data.kb_deleted"),
        variant: "success",
      });
    } catch {
      // API failed — remove from master store
      applyLocalDelete(selectedRow.id);
      showToast({
        message: t("settings.master_data.kb_deleted"),
        variant: "success",
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setSelectedRow(null);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("s_no", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("settings.master_data.kb_col_sno")}
          </span>
        ),
        cell: (info) => info.row.index + 1,
        canSort: false,
      }),
      columnHelper.accessor("name", {
        header: () => (
          <span className="order_orion_header">
            {t("settings.master_data.kb_name")}
          </span>
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("description", {
        header: () => (
          <span className="order_orion_header">
            {t("settings.master_data.kb_col_description")}
          </span>
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("createdBy", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdBy")}</span>
        ),
        cell: (info) => renderKbUserCell(info.row.original.createdBy),
      }),
      columnHelper.accessor("createdDate", {
        header: () => (
          <span className="order_orion_header">{t("settings.createdDate")}</span>
        ),
        cell: (info) => formatDisplayDate(info.getValue()),
      }),
      columnHelper.accessor("action", {
        header: () => (
          <span className="order_orion_header serial_no">
            {t("order_orion_v2.action")}
          </span>
        ),
        cell: (info) => {
          const kb = info.row.original;
          return (
            <div className="d-flex justify-content-center align-items-center gap-2">
              <button
                type="button"
                className="btn btn-0 p-1 border-0"
                title={t("common.edit")}
                onClick={() => openEdit(kb)}
              >
                <img src={pencilSimpleLine} alt="" />
              </button>
              <button
                type="button"
                className="btn btn-0 p-1 border-0"
                title={t("common.delete")}
                onClick={() => openDelete(kb)}
                disabled={deleting}
              >
                <img src={trashFull} alt="" />
              </button>
            </div>
          );
        },
        canSort: false,
      }),
    ],
    [deleting],
  );

  return (
    <Fragment>
      <div className="knowledge-base-masters userOverViewContainer">
        <Row className="align-items-start justify-content-between flex-wrap gap-3 mb-3">
          <Col xs={12} md="auto" className="flex-grow-1">
            <h3 className="knowledge-base-masters__title mb-1">
              {t("settings.master_data.knowledge_base_masters")}
            </h3>
            <p className="knowledge-base-masters__subtitle mb-0">
              {t("settings.master_data.kb_section_subtitle")}
            </p>
          </Col>
          <Col xs={12} md="auto" className="d-flex justify-content-md-end">
            <button
              type="button"
              className="btn border-0 add_user_btn"
              onClick={openCreate}
            >
              + {t("common.create")}
            </button>
          </Col>
        </Row>

        <KbFilterInput
          value={filterQuery}
          onChange={setFilterQuery}
          placeholder={t("settings.master_data.kb_filter_placeholder")}
          wrapperClassName="d-flex position-relative mb-3 knowledge-base-masters__filter"
          inputClassName="form-control knowledge-base-masters__filter-input"
          iconClassName="knowledge-base-masters__filter-icon"
        />

        <Row className="w-100 m-0 p-0 d-flex flex-row align-items-center justify-content-between mt-3 userListTable_Section">
          <div className="userListTable_Section p-0">
            <div className="tableSection">
              <Table
                columns={columns}
                columnData={filteredRows}
                className={classNames(
                  "products__body-table dashboard_table knowledge-base-table",
                )}
                tableName={"Order_list"}
                bgColor={"#FFF"}
                loading={loading}
                noDataContent={t("common.no_records")}
              />
            </div>
          </div>
        </Row>
      </div>

      <CreateKnowledgeBaseModal
        show={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingKb(null);
        }}
        knowledgeBase={editingKb}
        onSave={handleSaveKnowledgeBase}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => {
          if (deleting) return;
          setShowDeleteModal(false);
          setSelectedRow(null);
        }}
        confirmDelete={handleDeleteConfirm}
        message={
          <>
            {t("settings.master_data.kb_delete_confirm_prefix")}{" "}
            <b>{selectedRow?.name}</b>
            {t("settings.master_data.kb_delete_confirm_suffix")}
          </>
        }
      />
    </Fragment>
  );
};

export default KnowledgeBaseMasters;
