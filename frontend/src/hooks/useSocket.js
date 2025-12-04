import { useEffect } from "react";
import socketService from "../services/socket";

export const useSocket = (event, callback) => {
  useEffect(() => {
    socketService.on(event, callback);

    return () => {
      socketService.off(event, callback);
    };
  }, [event, callback]);
};
