/**
 * Excel Import Composable
 * Handles Excel file parsing, validation and error handling
 */

import type {
  ExcelParseOptions,
  ExcelParseResult,
  ExcelValidationRule,
  ProcessProgress,
  ValidationResult,
} from '@/types/document'
import { computed, ref } from 'vue'
import { excelService } from '@/services/document'

export interface UseExcelImportOptions extends ExcelParseOptions {
  validationRules?: ExcelValidationRule[]
  autoValidate?: boolean
  onProgress?: (progress: ProcessProgress) => void
}

export function useExcelImport(options?: UseExcelImportOptions) {
  const isParsing = ref(false)
  const isProcessing = ref(false)
  const progress = ref<ProcessProgress>({
    stage: 'parsing',
    percentage: 0,
  })
  const result = ref<ExcelParseResult | null>(null)
  const validationResult = ref<ValidationResult | null>(null)
  const error = ref<Error | null>(null)
  const currentFile = ref<File | null>(null)

  const hasError = computed(() => error.value !== null)
  const isSuccess = computed(() => result.value !== null && !error.value)
  const canExport = computed(() => result.value !== null && result.value.stats.validRows > 0)

  const parseFile = async (file: File): Promise<ExcelParseResult> => {
    reset()
    currentFile.value = file
    isParsing.value = true
    error.value = null

    try {
      progress.value = {
        stage: 'parsing',
        percentage: 0,
        message: 'Parsing file...',
      }

      const parseResult = await excelService.parseExcel(file, {
        ...options,
        maxRows: options?.maxRows || 100000,
      })

      result.value = parseResult

      progress.value = {
        stage: 'validating',
        percentage: 50,
        currentRow: parseResult.stats.totalRows,
        totalRows: parseResult.stats.totalRows,
        message: `Parsed ${parseResult.stats.totalRows} rows`,
      }

      if (options?.autoValidate && options.validationRules) {
        await validateData(options.validationRules)
      }

      progress.value = {
        stage: 'complete',
        percentage: 100,
        message: 'Processing complete',
      }

      return parseResult
    }
    catch (err: any) {
      error.value = err instanceof Error ? err : new Error('Parse failed')
      progress.value = {
        stage: 'complete',
        percentage: 0,
        message: `Parse failed: ${error.value.message}`,
      }
      throw err
    }
    finally {
      isParsing.value = false
    }
  }

  const validateData = async (rules?: ExcelValidationRule[]): Promise<ValidationResult> => {
    if (!result.value) {
      throw new Error('Please parse file first')
    }

    isProcessing.value = true
    error.value = null

    try {
      progress.value = {
        stage: 'validating',
        percentage: 50,
        message: 'Validating data...',
      }

      const validationRules = rules || options?.validationRules || []
      const allData = Object.values(result.value.data).flat()
      const validation = excelService.validateData(allData, validationRules)
      validationResult.value = validation

      progress.value = {
        stage: 'complete',
        percentage: 100,
        message: validation.valid
          ? 'Validation passed'
          : `Validation complete, ${validation.stats.invalid} rows with errors`,
      }

      return validation
    }
    catch (err: any) {
      error.value = err instanceof Error ? err : new Error('Validation failed')
      throw err
    }
    finally {
      isProcessing.value = false
    }
  }

  const getSheetData = (sheetName?: string): Record<string, any>[] => {
    if (!result.value) {
      return []
    }

    const sheets = result.value.data
    if (sheetName) {
      return sheets[sheetName] || []
    }

    const firstSheet = result.value.sheets[0]
    return sheets[firstSheet] || []
  }

  const getAllData = (): Record<string, any>[] => {
    if (!result.value) {
      return []
    }
    return Object.values(result.value.data).flat()
  }

  const reset = (): void => {
    isParsing.value = false
    isProcessing.value = false
    progress.value = {
      stage: 'parsing',
      percentage: 0,
    }
    result.value = null
    validationResult.value = null
    error.value = null
    currentFile.value = null
  }

  const downloadErrorReport = async (filename = 'error_report.xlsx'): Promise<void> => {
    if (!result.value || !validationResult.value) {
      throw new Error('No error data to export')
    }

    const errorRows = validationResult.value.errors.map(err => ({
      rowNumber: err.row,
      field: err.field,
      errorMessage: err.message,
      rawValue: err.value,
    }))

    await excelService.downloadExcel(
      {
        sheetName: 'Error Report',
        data: errorRows,
        columns: [
          { key: 'rowNumber', label: 'Row', width: 10 },
          { key: 'field', label: 'Field', width: 15 },
          { key: 'errorMessage', label: 'Error Message', width: 40 },
          { key: 'rawValue', label: 'Raw Value', width: 30 },
        ],
      },
      filename,
    )
  }

  return {
    isParsing,
    isProcessing,
    progress,
    result,
    validationResult,
    error,
    currentFile,
    hasError,
    isSuccess,
    canExport,
    parseFile,
    validateData,
    getSheetData,
    getAllData,
    reset,
    downloadErrorReport,
  }
}
