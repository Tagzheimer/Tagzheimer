import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeviceCard from '../components/DeviceCard.jsx';

const device = {
  _id: '000000000000000000000001',
  name: 'Patient Tracker #001',
  serialNumber: 'TAG-001',
  patientName: 'John Smith',
  status: 'online',
  battery: 87,
  lastSeen: new Date().toISOString(),
};

function renderCard(d = device) {
  return render(<MemoryRouter><DeviceCard device={d} /></MemoryRouter>);
}

describe('DeviceCard', () => {
  it('renders name and serial', () => {
    renderCard();
    expect(screen.getByText('Patient Tracker #001')).toBeInTheDocument();
    expect(screen.getByText('TAG-001')).toBeInTheDocument();
  });
  it('shows online pill', () => {
    renderCard();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
  it('shows offline for offline device', () => {
    renderCard({ ...device, status: 'offline' });
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
  it('shows battery percentage', () => {
    renderCard();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });
  it('has accessible button role', () => {
    renderCard();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', expect.stringContaining('Patient Tracker'));
  });
});
