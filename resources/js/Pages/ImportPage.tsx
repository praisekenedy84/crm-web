import { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import { csvRecords } from '@/lib/csv';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';

export default function ImportPage() {
  const { processing, submit } = useSubmit();
  const [contactResult, setContactResult] = useState('');
  const [areaResult, setAreaResult] = useState('');

  const handleContactFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const records = csvRecords(await file.text())
      .map((record) => ({
        first_name: record.first_name ?? '',
        last_name: record.last_name ?? '',
        email: record.email ?? '',
        phone: record.phone ?? '',
      }))
      .filter((record) => record.first_name && record.last_name);

    if (records.length === 0) {
      setContactResult('No contacts found. Check that the CSV contains First Name and Last Name columns.');
      return;
    }

    submit('post', '/import/contacts', { records }, {
      onSuccess: () => setContactResult(`Imported ${records.length} contacts.`),
      onError: (message) => setContactResult(message),
    });
  };

  const handleAreaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const records = csvRecords(await file.text())
      .map((record) => ({
        region: record.region ?? '',
        district: record.district ?? '',
        ward: record.ward ?? '',
        street: record.street ?? '',
      }))
      .filter((record) => record.region);

    if (records.length === 0) {
      setAreaResult('No territories found. Download the template and keep the Region column populated.');
      return;
    }

    submit('post', '/import/areas', { records }, {
      onSuccess: () => setAreaResult(`Imported territories from ${records.length} CSV rows.`),
      onError: (message) => setAreaResult(message),
    });
  };

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Import / Export</h1>
      <p className="mt-1 text-muted-foreground">Bulk data migration via CSV</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} /> Import Contacts
            </CardTitle>
            <CardDescription>CSV with columns: First Name, Last Name, Email, Phone</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={handleContactFile}
              disabled={processing}
              className="cursor-pointer"
            />
            {contactResult && (
              <Alert className="mt-4">
                <AlertDescription>{contactResult}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={20} /> Export Contacts
            </CardTitle>
            <CardDescription>Download all contacts as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => { window.location.href = '/import/contacts/csv'; }}>
              Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} /> Import Territories
            </CardTitle>
            <CardDescription>
              Add regions, districts, wards, and streets from a CSV file. Existing entries are reused.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => { window.location.href = '/import/areas/template'; }}>
              <Download size={16} />
              Download Template
            </Button>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={handleAreaFile}
              disabled={processing}
              className="cursor-pointer"
            />
            {areaResult && (
              <Alert>
                <AlertDescription>{areaResult}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
