import React from "react";
import UserListScreen from "@/components/UserListScreen";

export default function AllUsersScreen() {
  return (
    <UserListScreen
      role={undefined as any} // Will fetch all users
      title="All Users"
      icon="people-outline"
      color="#6366f1"
    />
  );
}