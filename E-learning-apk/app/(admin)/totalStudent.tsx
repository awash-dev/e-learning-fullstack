import React from "react";
import UserListScreen from "@/components/UserListScreen";

export default function TotalAdminScreen() {
  return (
    <UserListScreen
      role="admin"
      title="All Admins"
      icon="shield-outline"
      color="#dc2626"
    />
  );
}