"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, XCircle, Zap } from "lucide-react"
import type { PredictionSummary, AttendancePrediction } from "@/types/attendance"

interface PredictionSummaryProps {
  predictions: PredictionSummary
  onConfirmAll: () => void
  onConfirmHighConfidence: () => void
  onConfirmPrediction: (prediction: AttendancePrediction) => void
}

export function PredictionSummaryPanel({ 
  predictions, 
  onConfirmAll, 
  onConfirmHighConfidence,
  onConfirmPrediction 
}: PredictionSummaryProps) {
  const { totalPredictions, highConfidence, mediumConfidence, lowConfidence } = predictions

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'low': return <XCircle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Group predictions by confidence for easy review
  const highConfidencePredictions = predictions.predictions.filter(p => p.confidence === 'high')
  const mediumConfidencePredictions = predictions.predictions.filter(p => p.confidence === 'medium')
  const lowConfidencePredictions = predictions.predictions.filter(p => p.confidence === 'low')

  return (
    <Card className="mb-6 animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
          Attendance Predictions
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Total Predictions:</span>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              {totalPredictions}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {getConfidenceIcon('high')}
            <span className="text-sm">High: {highConfidence}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {getConfidenceIcon('medium')}
            <span className="text-sm">Medium: {mediumConfidence}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {getConfidenceIcon('low')}
            <span className="text-sm">Low: {lowConfidence}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={onConfirmAll}
            className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105"
            disabled={totalPredictions === 0}
          >
            Confirm All ({totalPredictions})
          </Button>
          
          <Button 
            variant="outline"
            onClick={onConfirmHighConfidence}
            disabled={highConfidence === 0}
            className="border-green-200 text-green-700 hover:bg-green-50 transition-all duration-200 hover:scale-105"
          >
            Confirm High Confidence ({highConfidence})
          </Button>
          
          <div className="text-xs text-muted-foreground">
            Space: Present • Alt: Absent • Click: Manual override
          </div>
        </div>

        {/* Prediction Details for Review */}
        {(mediumConfidence > 0 || lowConfidence > 0) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Review Required</h4>
            
            {/* Medium Confidence Predictions */}
            {mediumConfidencePredictions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getConfidenceIcon('medium')}
                  <span className="text-sm font-medium">Medium Confidence ({mediumConfidence})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {mediumConfidencePredictions.slice(0, 6).map((prediction, index) => (
                    <div 
                      key={`${prediction.studentId}-${prediction.sessionId}`}
                      className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          Student {prediction.studentId.split('-')[1]}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {prediction.sessionId.replace('session-', 'S')} → {prediction.predictedStatus}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-yellow-700 hover:bg-yellow-100"
                        onClick={() => onConfirmPrediction(prediction)}
                      >
                        ✓
                      </Button>
                    </div>
                  ))}
                  {mediumConfidencePredictions.length > 6 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      +{mediumConfidencePredictions.length - 6} more...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Low Confidence Predictions */}
            {lowConfidencePredictions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getConfidenceIcon('low')}
                  <span className="text-sm font-medium">Low Confidence ({lowConfidence})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {lowConfidencePredictions.slice(0, 6).map((prediction, index) => (
                    <div 
                      key={`${prediction.studentId}-${prediction.sessionId}`}
                      className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          Student {prediction.studentId.split('-')[1]}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {prediction.sessionId.replace('session-', 'S')} → {prediction.predictedStatus}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-700 hover:bg-red-100"
                        onClick={() => onConfirmPrediction(prediction)}
                      >
                        ✓
                      </Button>
                    </div>
                  ))}
                  {lowConfidencePredictions.length > 6 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      +{lowConfidencePredictions.length - 6} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Message for High Confidence */}
        {highConfidence === totalPredictions && totalPredictions > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                All predictions have high confidence! Ready to confirm.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}