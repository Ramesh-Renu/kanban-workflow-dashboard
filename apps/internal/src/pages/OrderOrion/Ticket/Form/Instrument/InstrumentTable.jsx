import React from "react";
import { Table, Form } from "react-bootstrap";

const InstrumentTable = ({
  instruments,
  selectedInstrumentIds,
  onSelectInstrument,
  viewOnly = false
}) => {
  const handleCheckboxChange = (instrumentId, checked) => {
    onSelectInstrument(instrumentId, checked);
  };

  const filteredInstruments = viewOnly
    ? instruments.filter((instrument) =>
      selectedInstrumentIds.some((item) => item.id === instrument.id)
    )
    : instruments;

  return (
    <Table striped hover responsive style={{ width: "100%", margin: viewOnly ? 0 : undefined}}>
      <thead>
        <tr>
          {!viewOnly && (
            <><th style={{ width: "50px", textAlign: "center" }}></th>
              <th style={{ width: "100px", textAlign: "center" }}>ID</th>
            </>)}
          <th style={{ width: "150px", textAlign: "center", whiteSpace: "nowrap" }}>
            Real time Data
          </th>
          <th style={{ textAlign: "center" }}>Name</th>
          <th style={{ textAlign: "center" }}>Market</th>
          <th style={{ textAlign: "center" }}>ISIN</th>
          <th style={{ textAlign: "center" }}>Symbol</th>
        </tr>
      </thead>
      <tbody>
        {instruments?.length > 0 &&
          filteredInstruments.map((instrument) => (
            <tr
              key={instrument.id}
              onClick={!viewOnly ? () =>
                handleCheckboxChange(
                  instrument,
                  !selectedInstrumentIds.some(
                    (item) => item.id === instrument.id
                  )
                ) : undefined
              }
              style={{ cursor: viewOnly ? "default" : "pointer" }}
            >
              {!viewOnly && (<><td onClick={(e) => e.stopPropagation()} style={{ width: "50px", textAlign: "center" }}>
                <Form.Check
                  type="checkbox"
                  checked={selectedInstrumentIds.some(
                    (item) => item.id === instrument.id
                  )}
                  id={instrument.id}
                  onChange={(e) =>
                    handleCheckboxChange(instrument, e.target.checked)
                  }
                />
              </td>              
              <td style={{ width: "100px", textAlign: "center" }}>{instrument.id}</td>
              </>)}
              <td style={{ width: "150px", textAlign: "center", whiteSpace: "nowrap" }}>{instrument.realTimeData ? "Yes" : "No"}</td>
              <td style={{ textAlign: "center" }}>{instrument.name}</td>
              <td style={{ textAlign: "center" }}>{instrument.market}</td>
              <td style={{ textAlign: "center" }}>{instrument.isin}</td>
              <td style={{ textAlign: "center" }}>{instrument.symbol}</td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
};

export default InstrumentTable;
