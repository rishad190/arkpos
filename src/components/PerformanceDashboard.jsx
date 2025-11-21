/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and bottlenecks
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import performanceTracker from '@/lib/performanceTracker';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshMetrics = () => {
    const currentMetrics = performanceTracker.getMetrics();
    const currentBottlenecks = performanceTracker.identifyBottlenecks();
    setMetrics(currentMetrics);
    setBottlenecks(currentBottlenecks);
  };

  useEffect(() => {
    refreshMetrics();

    if (autoRefresh) {
      const interval = setInterval(refreshMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleReset = () => {
    performanceTracker.reset();
    refreshMetrics();
  };

  if (!metrics) {
    return <div>Loading performance metrics...</div>;
  }

  const { summary, recentOperations, activeOperations } = metrics;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="space-x-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button onClick={refreshMetrics} size="sm" variant="outline">
            Refresh
          </Button>
          <Button onClick={handleReset} size="sm" variant="destructive">
            Reset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOperations}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activeOperations} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.averageDuration.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {(summary.totalDuration / 1000).toFixed(1)}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Slow Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.slowOperations}</div>
            <p className="text-xs text-muted-foreground">
              {summary.slowOperationPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Very Slow Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.verySlowOperations}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalOperations > 0
                ? ((summary.verySlowOperations / summary.totalOperations) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="bottlenecks" className="w-full">
        <TabsList>
          <TabsTrigger value="bottlenecks">
            Bottlenecks ({bottlenecks.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent Operations ({recentOperations.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Operations ({activeOperations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bottlenecks" className="space-y-4">
          {bottlenecks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No bottlenecks detected
                </p>
              </CardContent>
            </Card>
          ) : (
            bottlenecks.map((bottleneck, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {bottleneck.operationName}
                    </CardTitle>
                    <Badge
                      variant={
                        bottleneck.severity === 'high'
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {bottleneck.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Count:</span>{' '}
                      {bottleneck.count}
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Avg Duration:
                      </span>{' '}
                      {bottleneck.averageDuration.toFixed(0)}ms
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Total Duration:
                      </span>{' '}
                      {(bottleneck.totalDuration / 1000).toFixed(1)}s
                    </div>
                    <div>
                      <span className="text-muted-foreground">Slow Rate:</span>{' '}
                      {bottleneck.slowPercentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium">Recommendation:</p>
                    <p className="text-sm text-muted-foreground">
                      {bottleneck.recommendation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-2">
          <Card>
            <CardContent className="pt-6">
              {recentOperations.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No recent operations
                </p>
              ) : (
                <div className="space-y-2">
                  {recentOperations.map((op, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{op.name}</span>
                        {op.isSlow && (
                          <Badge variant="destructive" className="ml-2">
                            Slow
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {op.duration}ms
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">
                        {new Date(op.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-2">
          <Card>
            <CardContent className="pt-6">
              {activeOperations.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No active operations
                </p>
              ) : (
                <div className="space-y-2">
                  {activeOperations.map((op, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{op.name}</span>
                        <Badge variant="outline" className="ml-2">
                          Running
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {op.duration}ms elapsed
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">
                        Started: {new Date(op.startTime).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Budget Status */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <PerformanceBudgetItem
              label="Slow Operation Rate"
              value={summary.slowOperationPercentage}
              budget={5}
              unit="%"
              inverse
            />
            <PerformanceBudgetItem
              label="Average Duration"
              value={summary.averageDuration}
              budget={500}
              unit="ms"
              inverse
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceBudgetItem({ label, value, budget, unit, inverse = false }) {
  const percentage = (value / budget) * 100;
  const isWithinBudget = inverse ? value <= budget : value >= budget;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isWithinBudget ? 'text-green-600' : 'text-red-600'}>
          {value.toFixed(1)}
          {unit} / {budget}
          {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            isWithinBudget ? 'bg-green-600' : 'bg-red-600'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default PerformanceDashboard;
