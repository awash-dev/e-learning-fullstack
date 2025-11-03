// components/CourseList.tsx
import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Course } from "@/services/api";
import CourseCard from "./CourseCard";

interface CourseListProps {
  courses: Course[];
  title?: string;
  subtitle?: string;
  variant?: "grid" | "list" | "featured";
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  showFilters?: boolean;
  emptyMessage?: string;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  title,
  subtitle,
  variant = "list",
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
  showFilters = false,
  emptyMessage = "No courses found",
}) => {
  const renderCourseItem = ({
    item,
    index,
  }: {
    item: Course;
    index: number;
  }) => {
    if (variant === "grid") {
      return (
        <View
          style={[
            styles.gridItem,
            index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
          ]}
        >
          <CourseCard course={item} variant="small" />
        </View>
      );
    }

    if (variant === "featured") {
      return (
        <View style={styles.featuredItem}>
          <CourseCard course={item} variant="featured" />
        </View>
      );
    }

    return <CourseCard course={item} />;
  };

  const renderHeader = () => {
    if (!title && !subtitle && !showFilters) return null;

    return (
      <View style={styles.header}>
        {(title || subtitle) && (
          <View style={styles.titleContainer}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}

        {showFilters && (
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#64748b" />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="book-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>No Courses</Text>
      <Text style={styles.emptyMessage}>{emptyMessage}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || courses.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#667eea" />
        <Text style={styles.footerText}>Loading more courses...</Text>
      </View>
    );
  };

  if (variant === "grid") {
    return (
      <View style={styles.container}>
        {renderHeader()}

        {loading && courses.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading courses...</Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item._id || item.title}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#667eea"]}
                  tintColor="#667eea"
                />
              ) : undefined
            }
            ListEmptyComponent={renderEmptyComponent}
            ListFooterComponent={renderFooter}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.gridContent}
          />
        )}
      </View>
    );
  }

  if (variant === "featured") {
    return (
      <View style={styles.container}>
        {renderHeader()}

        {loading && courses.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading featured courses...</Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item._id || item.title}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.featuredContent}
            ListEmptyComponent={renderEmptyComponent}
          />
        )}
      </View>
    );
  }

  // Default list variant
  return (
    <View style={styles.container}>
      {renderHeader()}

      {loading && courses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item._id || item.title}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#667eea"]}
                tintColor="#667eea"
              />
            ) : undefined
          }
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  // Grid Styles
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  gridItem: {
    marginBottom: 16,
  },
  gridItemLeft: {
    marginRight: 8,
  },
  gridItemRight: {
    marginLeft: 8,
  },
  gridContent: {
    paddingBottom: 16,
  },
  // Featured Styles
  featuredItem: {
    marginRight: 16,
  },
  featuredContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // List Styles
  listContent: {
    paddingBottom: 16,
  },
  // Common Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
  },
});

export default CourseList;
