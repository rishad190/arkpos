"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Tag, X } from "lucide-react";
import { CUSTOMER_CONSTANTS } from "@/lib/constants";

export function CustomerSearch({
  searchTerm,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  selectedTags,
  onTagsChange,
  allTags,
}) {
  const handleTagClick = (tag) => {
    onTagsChange((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CUSTOMER_CONSTANTS.FILTER_OPTIONS.ALL}>
              All Customers
            </SelectItem>
            <SelectItem value={CUSTOMER_CONSTANTS.FILTER_OPTIONS.DUE}>
              With Due
            </SelectItem>
            <SelectItem value={CUSTOMER_CONSTANTS.FILTER_OPTIONS.PAID}>
              Fully Paid
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tag Filters */}
      {allTags?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Filter by Fabric Preferences:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => onTagsChange([])}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Clear all tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}
