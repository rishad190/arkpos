"use client";
import { useReducer, useMemo, useCallback, useEffect } from "react";
import { AtomicOperationService } from "@/services/atomicOperations";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

const initialState = {
  offlineQueue: [],
  pendingOperations: new Set(),
  connectionState: "connected", // Default to connected
  performanceMetrics: {
    operationCount: 0,
    slowOperations: 0,
    averageResponseTime: 0,
    lastOperationTime: null,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_PENDING_OPERATION":
      return {
        ...state,
        pendingOperations: new Set([...state.pendingOperations, action.payload]),
      };
    case "REMOVE_PENDING_OPERATION":
      const newPending = new Set(state.pendingOperations);
      newPending.delete(action.payload);
      return {
        ...state,
        pendingOperations: newPending,
      };
    case "ADD_TO_OFFLINE_QUEUE":
      return {
        ...state,
        offlineQueue: [...state.offlineQueue, action.payload],
      };
    case "REMOVE_FROM_OFFLINE_QUEUE":
      return {
        ...state,
        offlineQueue: state.offlineQueue.filter((_, i) => i !== action.payload),
      };
    case "UPDATE_OFFLINE_QUEUE_ITEM":
      return {
        ...state,
        offlineQueue: state.offlineQueue.map((item, index) =>
          index === action.payload.index
            ? { ...item, ...action.payload.updates }
            : item
        ),
      };
     case "UPDATE_PERFORMANCE_METRICS":
      return {
        ...state,
        performanceMetrics: {
          ...state.performanceMetrics,
          ...action.payload,
        },
      };
    case "SET_CONNECTION_STATE":
      return {
        ...state,
        connectionState: action.payload,
      };
    default:
      return state;
  }
}

import { useReducer, useMemo, useCallback, useEffect } from "react";
import { AtomicOperationService } from "@/services/atomicOperations";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase"; // Assuming db is available here

// ... (initialState and reducer remain same)

export function useAtomicOperations() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getState = useCallback(() => state, [state]);

  const service = useMemo(() => {
    return new AtomicOperationService(dispatch, getState);
  }, [dispatch, getState]); 

  // Connection monitoring and offline queue processing
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val();
      const previousState = state.connectionState;
      const newState = connected ? "connected" : "disconnected";

      dispatch({ type: "SET_CONNECTION_STATE", payload: newState });

      if (connected && previousState === "disconnected") {
        // Process offline queue when connection is restored
        // Small delay to ensure state updates
        setTimeout(() => {
          service.processOfflineQueue();
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [state.connectionState, service]);

  return {
    service,
    state,
    dispatch,
  };
}
