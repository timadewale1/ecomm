import React, { useState } from "react";
import { Container, Row, Col, Modal, ModalHeader, ModalBody } from "reactstrap";
import useGetData from "../custom-hooks/useGetData";
import { db } from "../firebase.config";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const AllOrders = () => {
  const { data: ordersData, loading } = useGetData("orders");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const deleteOrder = async (id) => {
    await deleteDoc(doc(db, "orders", id));
    toast.success("Order Deleted");
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  const closeViewOrderDetails = () => {
    setSelectedOrder(null);
  };

  return (
    <>
      <section>
        <Container>
          <Row>
            <Col lg="12">
              <table className="table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <h4 className="py-5 text-center fw-500">Loading....</h4>
                  ) : (
                    ordersData.map((order) => (
                      <tr key={order.id}>
                        <td>
                          {order.items?.[0]?.imgUrl && (
                            <img src={order.items[0].imgUrl} alt="" />
                          )}
                        </td>
                        <td>{order.items?.[0]?.productName}</td>
                        <td>{order.billingInfo?.name}</td>
                        <td>
                          <motion.button
                            whileTap={{ scale: 1.2 }}
                            onClick={() => viewOrderDetails(order)}
                            className="btn btn-info me-2"
                          >
                            View Details
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 1.2 }}
                            // onClick={() => completeOrder(order.id)}
                            className="btn btn-success me-2"
                          >
                            Complete Order
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 1.2 }}
                            onClick={() => deleteOrder(order.id)}
                            className="btn btn-danger"
                          >
                            Delete
                          </motion.button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Col>
          </Row>
        </Container>

        {/* View Order Details Modal */}
        {selectedOrder && (
          <Modal isOpen={TextTrackCue} toggle={closeViewOrderDetails}>
            <ModalHeader toggle={closeViewOrderDetails}>
              Order Details
            </ModalHeader>
            <ModalBody>
              <p>User Name: {selectedOrder.billingInfo?.name}</p>
              <p>User Email: {selectedOrder.billingInfo?.email}</p>
              <p>User Phone Number: {selectedOrder.billingInfo?.phoneNumber}</p>
              <p>Street Address: {selectedOrder.billingInfo?.streetAddress}</p>
              <p>City: {selectedOrder.billingInfo?.city}</p>
              {/* Loop through all ordered items and display relevant information */}
              {selectedOrder.items.map((item) => (
                <div key={item.id}>
                  <p>Product Name: {item.productName}</p>
                  <img src={item.imgUrl} alt="" />
                </div>
              ))}
            </ModalBody>
          </Modal>
        )}
      </section>
    </>
  );
};

export default AllOrders;
