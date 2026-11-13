"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaginationMeta } from '@/types/api';
import { Plus, FileText } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Quotations & Proposals"
        subtitle="Manage formal business quotations, pricing estimates, discounts and proposal approvals"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Quotations' },
        ]}
      />

      <DataTable
        columns={[
          { key: 'quote_number', header: 'Quote #' },
          { key: 'customer_name', header: 'Customer' },
          { key: 'total_value', header: 'Total Value', render: (q) => formatCurrency(q.total_value) },
          { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status || 'Draft'} /> },
          { key: 'valid_until', header: 'Valid Until', render: (q) => (q.valid_until ? formatDate(q.valid_until) : '-') },
        ]}
        data={quotations}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />
    </div>
  );
}

