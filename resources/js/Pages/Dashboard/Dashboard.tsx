import { Fragment } from "react";
import PageHeader from "../../Layouts/layoutcomponents/pageHeader";
import {
    Alert,
    Card,
    Col,
    OverlayTrigger,
    ProgressBar,
    Row,
    Tooltip,
} from "react-bootstrap";
import { Imagesdata } from "../../commondata/commonimages";
import { Link } from "@inertiajs/react";
import AppLayout from "../../Layouts/app";

function Dashboard({ errors }: { errors: { error: string } }) {
    interface activity {
        id: number;
        color: string;
        data: string;
        data1: string;
        text: string;
        text1: string;
    }

    return (
        <AppLayout>
            <Fragment>
                <PageHeader
                    titles="Sistema Administrativo"
                    active="Dashboard 01"
                    items={[]}
                />
                <Row>
                    <Col lg={12} md={12} sm={12} xl={12}>
                        {errors?.error && (
                            <Alert
                                variant="danger"
                                className="alert-dismissible"
                            >
                                <i className="fe fe-slash"> </i>

                                {errors?.error}
                            </Alert>
                        )}
                    </Col>
                </Row>
            </Fragment>
        </AppLayout>
    );
}

export default Dashboard;
