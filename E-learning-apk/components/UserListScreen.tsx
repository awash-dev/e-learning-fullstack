import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { authAPI, type User } from "@/services/api";

const SPACING = { large: 24, medium: 16, small: 8, xlarge: 32 };

// User Card Component
const UserCard = ({ 
  user, 
  onPress,
  roleColor,
}: { 
  user: User; 
  onPress: () => void;
  roleColor: string;
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "admin":
        return { backgroundColor: "#dc2626", color: "#fff" };
      case "instructor":
        return { backgroundColor: "#f59e0b", color: "#fff" };
      case "student":
        return { backgroundColor: "#6366f1", color: "#fff" };
      default:
        return { backgroundColor: "#64748b", color: "#fff" };
    }
  };

  const badgeStyle = getRoleBadgeStyle(user.role);

  return (
    <TouchableOpacity style={styles.userCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.userCardLeft}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatarPlaceholder, { backgroundColor: roleColor + "20" }]}>
            <Text style={[styles.userAvatarText, { color: roleColor }]}>
              {getInitials(user.name)}
            </Text>
          </View>
        )}

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            {user.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            )}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
              <Text style={[styles.roleBadgeText, { color: badgeStyle.color }]}>
                {user.role?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userMetaText}>•</Text>
            <Text style={styles.userMetaText}>
              Joined {formatDate(user.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.emptyState}>
    <Ionicons name="people-outline" size={64} color="#cbd5e0" />
    <Text style={styles.emptyStateText}>{message}</Text>
  </View>
);

// Loading Skeleton
const UserCardSkeleton = () => (
  <View style={styles.userCard}>
    <View style={styles.userCardLeft}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonInfo}>
        <View style={[styles.skeletonLine, { width: "70%", height: 16 }]} />
        <View style={[styles.skeletonLine, { width: "90%", height: 14, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: "50%", height: 12, marginTop: 6 }]} />
      </View>
    </View>
  </View>
);

interface UserListScreenProps {
  role: "student" | "instructor" | "admin";
  title: string;
  icon: string;
  color: string;
}

const UserListScreen: React.FC<UserListScreenProps> = ({ role, title, icon, color }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter options
  const [filterVerified, setFilterVerified] = useState<boolean | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch users based on role
  const fetchUsers = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let result;
      
      // Fetch based on role
      switch (role) {
        case "student":
          result = await authAPI.getAllStudents({
            page,
            limit: 20,
            search: searchQuery || undefined,
            isVerified: filterVerified,
          });
          break;
        case "instructor":
          result = await authAPI.getAllInstructors({
            page,
            limit: 20,
            search: searchQuery || undefined,
            isVerified: filterVerified,
          });
          break;
        case "admin":
          result = await authAPI.getAllAdmins({
            page,
            limit: 20,
            search: searchQuery || undefined,
            isVerified: filterVerified,
          });
          break;
        default:
          result = await authAPI.getAllUsers({
            page,
            limit: 20,
            search: searchQuery || undefined,
            isVerified: filterVerified,
          });
      }

      console.log('📥 API Response:', result);

      if (result.success && result.data) {
        if (page === 1) {
          setUsers(result.data.users);
          setFilteredUsers(result.data.users);
        } else {
          setUsers((prev) => [...prev, ...result.data.users]);
          setFilteredUsers((prev) => [...prev, ...result.data.users]);
        }

        setTotalUsers(result.data.totalUsers);
        setCurrentPage(result.data.currentPage);
        setTotalPages(result.data.totalPages);
      } else {
        Alert.alert("Error", result.error?.message || `Failed to fetch ${role}s`);
      }
    } catch (error) {
      console.error(`Error fetching ${role}s:`, error);
      Alert.alert("Error", `Failed to fetch ${role}s`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [role, searchQuery, filterVerified]);

  useEffect(() => {
    fetchUsers(1, false);
  }, [filterVerified]);

  // Search handler with debounce
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery !== "") {
        setCurrentPage(1);
        fetchUsers(1, false);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
    fetchUsers(1, false);
  };

  // Clear filters
  const clearFilters = () => {
    setFilterVerified(undefined);
    setSearchQuery("");
    setShowFilters(false);
  };

  // Refresh handler
  const onRefresh = useCallback(() => {
    setCurrentPage(1);
    fetchUsers(1, true);
  }, [fetchUsers]);

  // Load more handler
  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchUsers(currentPage + 1, false);
    }
  };

  // Navigate to user details
  const handleUserPress = (user: User) => {
    Alert.alert(
      user.name,
      `Role: ${user.role?.toUpperCase()}\nEmail: ${user.email}\nID: ${user.id}\nVerified: ${user.isVerified ? "Yes" : "No"}\nAuth Method: ${user.authMethod || 'N/A'}`,
      [{ text: "OK" }]
    );
    // TODO: Implement user detail screen
    // router.push(`/(admin)/user/${user.id}`);
  };

  // Render footer (load more)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={color} />
        <Text style={styles.loadMoreText}>Loading more {role}s...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name={icon as any} size={24} color={color} />
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {totalUsers} {totalUsers === 1 ? role : `${role}s`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? "close" : "options-outline"}
            size={24}
            color="#1e293b"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filters</Text>
          
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Verification Status:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterVerified === undefined && styles.filterChipActive,
                ]}
                onPress={() => setFilterVerified(undefined)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterVerified === undefined && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterVerified === true && styles.filterChipActive,
                ]}
                onPress={() => setFilterVerified(true)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterVerified === true && styles.filterChipTextActive,
                  ]}
                >
                  Verified
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterVerified === false && styles.filterChipActive,
                ]}
                onPress={() => setFilterVerified(false)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterVerified === false && styles.filterChipTextActive,
                  ]}
                >
                  Unverified
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Users List */}
      {loading ? (
        <View style={styles.content}>
          {[...Array(10)].map((_, index) => (
            <UserCardSkeleton key={index} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserCard 
              user={item} 
              onPress={() => handleUserPress(item)}
              roleColor={color}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[color]}
              tintColor={color}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              message={
                searchQuery
                  ? `No ${role}s found matching your search`
                  : `No ${role}s registered yet`
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginTop: 25,
  },
  backButton: {
    padding: SPACING.small,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  filterButton: {
    padding: SPACING.small,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: SPACING.large,
    marginTop: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    marginRight: SPACING.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },

  // Filters
  filtersContainer: {
    backgroundColor: "#fff",
    marginHorizontal: SPACING.large,
    marginTop: SPACING.medium,
    padding: SPACING.medium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: SPACING.medium,
  },
  filterRow: {
    marginBottom: SPACING.medium,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: SPACING.small,
  },
  filterButtons: {
    flexDirection: "row",
    gap: SPACING.small,
  },
  filterChip: {
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  clearFiltersButton: {
    alignSelf: "flex-start",
    paddingVertical: SPACING.small,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },

  // List
  content: {
    flex: 1,
    padding: SPACING.large,
  },
  listContent: {
    padding: SPACING.large,
    paddingBottom: SPACING.xlarge,
  },

  // User Card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: SPACING.medium,
    borderRadius: 12,
    marginBottom: SPACING.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.medium,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.medium,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  userMetaText: {
    fontSize: 12,
    color: "#94a3b8",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xlarge * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: SPACING.medium,
    textAlign: "center",
  },

  // Load More
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.medium,
    gap: SPACING.small,
  },
  loadMoreText: {
    fontSize: 14,
    color: "#64748b",
  },

  // Skeleton
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0",
    marginRight: SPACING.medium,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonLine: {
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
  },
});

export default UserListScreen;