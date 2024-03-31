import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { setNotification, setSingleNotification } from "../redux/notifications/notificationSlice";
import { activeChatId } from "./Conversations";
import { signal } from "@preact/signals-react";

// Establish socket connection
export const socket = io("https://thunder-scarlet-wizard.glitch.me/", {
  headers: {
    "user-agent": "chrome"
  }
});

// Create signal for notifications
export const notifySignal = signal({
  notifications: []
});

const SocketConnection = () => {
  const { currentUser } = useSelector(state => state.user);
  const dispatch = useDispatch();

  // Load previous notifications on component mount
  useEffect(() => {
    const loadPrevNotifications = async () => {
      try {
        const unseenNotification = await fetch(`/api/notification/${currentUser._id}`);
        const res = await unseenNotification.json();
        if (res.success) {
          notifySignal.value.notifications = res;
          dispatch(setNotification(res));
        } else {
          console.log(res);
        }
      } catch (error) {
        console.log(error.message);
      }
    };

    if (currentUser) {
      loadPrevNotifications();
    }
  }, [currentUser, dispatch]);

  // Send notification to database
  const sendNotificationToDB = async (notificationData) => {
    try {
      const sendNotification = await fetch("/api/notification/create", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      const response = await sendNotification.json();
      if (!response.success) {
        console.log(response);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Listen for socket events
  useEffect(() => {
    const handleSocketNotification = (socketNotification) => {
      const currentPath = window.location.pathname;

      if (currentPath !== "/message") {
        activeChatId.value.chatId = "";
      }

      const isNotificationExist = notifySignal.value.notifications.some(notify => notify.chatId === socketNotification.chatId);

      if (socketNotification.chatId !== activeChatId.value.chatId && !isNotificationExist) {
        notifySignal.value.notifications = [...notifySignal.value.notifications, socketNotification];
        dispatch(setSingleNotification(socketNotification));
        sendNotificationToDB(socketNotification);
      }
    };

    socket.on(`${currentUser?._id}`, handleSocketNotification);

    return () => {
      socket.off(`${currentUser?._id}`, handleSocketNotification);
    };
  }, [currentUser, dispatch]);

  return null; // No UI elements to render
};

export default SocketConnection;
