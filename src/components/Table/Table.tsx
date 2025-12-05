'use client';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { SortingState, ColumnDef } from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TestResult, TableProps } from './Table.types';
import { useTranslation } from '@/hooks/useTranslation';

export const Table = ({ data, className }: TableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const t = useTranslation();

  const columns: ColumnDef<TestResult>[] = useMemo(() => [
    {
      accessorKey: 'dateTime',
      header: t('Date/Time') + ' ↓',
      cell: (info) => (
        <div className="text-xs sm:text-sm text-gray-700 font-sans">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'testType',
      header: t('Test Type'),
      cell: (info) => (
        <div className="text-xs sm:text-sm text-gray-700 font-sans">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'testId',
      header: t('Test ID'),
      cell: (info) => (
        <div className="text-xs sm:text-sm text-gray-700 font-sans">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'latency',
      header: () => (
        <div className="text-center">
          {t('Latency')}
          <br />
          <span className="text-[10px] sm:text-xs text-gray-500">(ms)</span>
        </div>
      ),
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="text-xs sm:text-sm text-gray-700 font-sans text-center">
            {value != null ? Number(value).toFixed(2) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'download',
      header: () => (
        <div className="text-center">
          {t('Download')}
          <br />
          <span className="text-[10px] sm:text-xs text-gray-500">(Mbps)</span>
        </div>
      ),
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="text-xs sm:text-sm text-gray-700 font-sans text-center">
            {value != null ? Number(value).toFixed(2) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'upload',
      header: () => (
        <div className="text-center">
          {t('Upload')}
          <br />
          <span className="text-[10px] sm:text-xs text-gray-500">(Mbps)</span>
        </div>
      ),
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="text-xs sm:text-sm text-gray-700 font-sans text-center">
            {value != null ? Number(value).toFixed(2) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'webBrowsing',
      header: () => (
        <div className="text-center">
          {t('Web Browsing')}
          <br />
          <span className="text-[10px] sm:text-xs text-gray-500">({t('seconds')})</span>
        </div>
      ),
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="text-xs sm:text-sm text-gray-700 font-sans text-center">
            {value != null ? Number(value).toFixed(3) : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'videoStreaming',
      header: () => (
        <div className="text-center">
          {t('Video Streaming')}
          <br />
          <span className="text-[10px] sm:text-xs text-gray-500">({t('seconds')})</span>
        </div>
      ),
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="text-xs sm:text-sm text-gray-700 font-sans text-center">
            {value != null ? Number(value).toFixed(3) : '-'}
          </div>
        );
      },
    },
  ], [t]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-6 sm:gap-8 md:gap-10 lg:gap-[45px] w-full max-w-[1316px] mx-auto px-3 sm:px-4 lg:px-0',
        className
      )}
    >
      {/* Header */}
      <div className="text-center px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-sans text-gray-900 mb-2">
          {t('Your Previous Test Results')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 font-sans">
          {t('Browse and analyze your internet quality test results')}
        </p>
      </div>

      {/* Table Container with horizontal scroll on mobile */}
      <div className="w-full overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full border-collapse bg-white min-w-[800px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 font-sans bg-gray-50"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 sm:px-3 md:px-4 py-3 sm:py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 sm:gap-4 px-2 sm:px-4">
        <div className="text-xs sm:text-sm text-gray-600 font-sans">
          {t('Total')} {data.length} {t('items')}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 sm:px-3 py-1 text-sm font-sans text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ‹
          </button>

          {table.getPageOptions().map((page) => {
            const currentPage = table.getState().pagination.pageIndex;
            const totalPages = table.getPageCount();

            // Show first page, last page, current page, and pages around current
            if (
              page === 0 ||
              page === totalPages - 1 ||
              (page >= currentPage - 2 && page <= currentPage + 2)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => table.setPageIndex(page)}
                  className={cn(
                    'px-2 sm:px-3 py-1 text-xs sm:text-sm font-sans rounded',
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {page + 1}
                </button>
              );
            } else if (page === currentPage - 3 || page === currentPage + 3) {
              return (
                <span key={page} className="px-1 sm:px-2 text-gray-500 text-xs sm:text-sm">
                  ...
                </span>
              );
            }
            return null;
          })}

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 sm:px-3 py-1 text-sm font-sans text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-sans border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[10, 20, 30, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} / page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-600 font-sans">{t('Go to')}</span>
            <input
              type="number"
              min="1"
              max={table.getPageCount()}
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
              className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-xs sm:text-sm font-sans border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
