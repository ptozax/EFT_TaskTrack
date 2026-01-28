import React, { Component } from "react";
import { motion, AnimatePresence } from "framer-motion";


class Sidebar extends Component {
render() {
  const {
    children,
    isOpen,
    cssStyle,
    cNameStyle,
    duration = 0.3,
    width = "50%",
    hight = "100%",
    isLeftSide = true
  } = this.props;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: isLeftSide ? "-100%" : "100%" }}
          animate={{ x: 0 }}
          exit={{ x: isLeftSide ? "-100%" : "100%" }}
          transition={{ type: "tween", duration }}
          className={` position-fixed  ${ isLeftSide ? "start-0" : "end-0" } ${cNameStyle}`}
          style={{
            width,
            height: hight,
            ...cssStyle
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
}

export default Sidebar;  