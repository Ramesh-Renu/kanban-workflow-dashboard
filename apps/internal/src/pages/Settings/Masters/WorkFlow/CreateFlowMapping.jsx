import { useState } from "react";
import { Row, Col, Spinner } from "react-bootstrap";
import { SelectDropDown } from "@orion/shared";
import { createWorkFlowMapping } from "../../../../services";
import { t } from "i18next";
import { useToast } from "@orion/shared";

const CreateFlowMapping = ({ workFlowList, toolsList, refreshWorkflowMapping, mappingRows, masterWorkFlowType }) => {

    const { showToast } = useToast();
    const [selectedFlowId, setSelectedFlowId] = useState(null);
    const [selectedToolIds, setSelectedToolIds] = useState([]);
    const [loadingMapping, setLoadingMapping] = useState(false);

    // Extract tool IDs that are already mapped
    const alreadyMappedToolIds = mappingRows?.map((m) => m._raw.tool_id).flat() || [];

    // Filter out the already created tools
    const availableTools = toolsList?.data?.filter(
        (tool) => !alreadyMappedToolIds.includes(tool.toolId)
    ) || [];

    const excludedStatusIds = masterWorkFlowType
    ?.filter((w) => w.name.toLowerCase() === "task")
    .map((w) => w.status_id) || [];

    /** MAPPING FORM */
    const workflowMappingForm = [
        {
            label: t("settings.formField.flowName"),
            value: selectedFlowId
                ? [workFlowList?.data.find((w) => w.flow_id === selectedFlowId)]
                : [],
            multi: false,
            searchable: true,
            options: workFlowList?.data?.filter((w) => !excludedStatusIds.includes(w.workflowType)) || [],            
            typeof: "dropDown",
            key: "flow_id",
            labelField: "name",
            valueField: "flow_id",
            disabled: !workFlowList?.data?.length,
            optionType: "radio",
        },
        {
            label: t("order_orion_v2.tools"),
            value:
                selectedToolIds?.length > 0
                    ? toolsList.data.filter((t) => selectedToolIds.includes(t.toolId))
                    : [],
            multi: true,
            searchable: true,
            options: availableTools,
            typeof: "dropDown",
            key: "toolId",
            labelField: "toolName",
            valueField: "toolId",
            disabled: !availableTools?.length,
            optionType: "checkbox",
        },
    ];

    /** ADD MAPPING */
    const handleAddMapping = async () => {
        if (!selectedFlowId || !selectedToolIds.length) {
            showToast({
                message: "Please select both Flow and Tool",
                variant: "warning",
            });
            return;
        }
        try {
            setLoadingMapping(true);
            const payload = {
                tool_flow_id: 0,
                flow_id: selectedFlowId,
                tool_id: selectedToolIds,
            };
            const response = await createWorkFlowMapping(payload);
            if (response?.data?.status) {
                showToast({
                    message: response?.data?.message || "Mapping added successfully",
                    variant: "success",
                });
                refreshWorkflowMapping();
                setSelectedFlowId(null);
                setSelectedToolIds([]);
            } else {
                showToast({
                    message: response?.data?.message || "Failed to add mapping",
                    variant: "danger",
                });
            }
        } catch (err) {
            console.error(err);
            showToast({ message: "Something went wrong", variant: "danger" });
        } finally {
            setLoadingMapping(false);
        }
    };

    return (
        <Col className="p-0">
            <h4 className="form-header">Sub Task Flow Mapping</h4>
            <div className="form-Container">
                <Row className="d-flex flex-row align-items-end row-gap-3 flex-wrap">
                    {workflowMappingForm.map((val, index) => (
                        <Col xs={3} key={index}>
                            <SelectDropDown
                                id={val.key}
                                multi={val.multi}
                                options={val.options}
                                labelField={val.labelField}
                                valueField={val.valueField}
                                searchable={val.searchable}
                                optionType={val.optionType}
                                customSearch="true"
                                values={val.value}
                                onChange={(e) => {
                                    if (val.key === "flow_id") {
                                        const selected = Array.isArray(e) ? e[0] : e;
                                        setSelectedFlowId(selected?.flow_id || null);
                                    } else if (val.key === "toolId") {
                                        const selected = Array.isArray(e) ? e : [e];
                                        setSelectedToolIds(selected.map((t) => t.toolId));
                                    }
                                }}
                                placeholder={`${t("common.select")} ${val.label}`}
                                className="multiple-select mt-2"
                                disabled={val.disabled}
                            />
                        </Col>
                    ))}
                    <Col xs={2}>
                        <button
                            className="btn border-0 add_user_btn"
                            onClick={handleAddMapping}
                            disabled={loadingMapping || !selectedFlowId || !selectedToolIds.length}
                        >
                            {loadingMapping ? "Adding..." : "Add Mapping"}
                            {loadingMapping && (
                                <>
                                    &#160;
                                    <Spinner as="span" animation="border" size="sm" role="status" />
                                </>
                            )}
                        </button>
                    </Col>
                </Row>
            </div>
        </Col>
    )
}

export default CreateFlowMapping;
