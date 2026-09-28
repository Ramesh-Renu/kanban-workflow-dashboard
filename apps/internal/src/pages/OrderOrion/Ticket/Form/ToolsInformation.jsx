import { Fragment } from "react";

const ToolsInformation = ({ ...props }) => {
    // console.log('props',props);
    
    return(
        <Fragment>
            <h5>{props?.selectedToolForm?.name}</h5>
        </Fragment>
    )
};
export default ToolsInformation;
