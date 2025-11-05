import { useState, useEffect, useCallback, forwardRef } from 'react';
import {
  IconButton, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, Tooltip, Box, Grow
} from '@mui/material';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import SaveIcon from '@mui/icons-material/Save';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";

const INITIAL_FORM = {
  dateValue: dayjs(),
  responsable: '',
  email: '',
  raison: '',
  observation: ''
};

const GrowTransition = forwardRef((props, ref) => <Grow ref={ref} {...props} />);

const FIELDS = [
  { name: 'responsable', label: 'Responsable', required: true },
  { name: 'email', label: 'Email', required: true, type: 'email' },
  { name: 'raison', label: 'Activité', required: true, multiline: true, rows: 3 },
  { name: 'observation', label: 'Observation', multiline: true, rows: 2 }
];

const validate = data => {
  if (!data.responsable.trim()) return "Le responsable est requis";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Email invalide";
  if (!data.raison.trim()) return "L'activité est requise";
  return null;
};

const makePayload = (row, data) => ({
  id: row.id,
  nom_responsable: data.responsable.trim(),
  mail_responsable: data.email.trim(),
  raison: data.raison.trim(),
  observation: data.observation.trim(),
  datelimite: data.dateValue.format("YYYY-MM-DDTHH:mm")
});

export default function EditActivityDialog({ refreshRows, rowData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (open && rowData) {
      setForm({
        dateValue: rowData.datelimite ? dayjs(rowData.datelimite) : dayjs(),
        responsable: rowData.nom || '',
        email: rowData.mail || '',
        raison: rowData.raison || '',
        observation: rowData.observation || ''
      });
    }
  }, [open, rowData]);

  const handleChange = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const handleDate = newDate => {
    if (!newDate) return;
    setForm(f => ({ ...f, dateValue: newDate.minute(0).second(0) }));
  };

  const submit = async e => {
    e.preventDefault();
    if (!rowData?.id) return toast.error("ID manquant");

    const err = validate(form);
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const params = makePayload(rowData, form);
      await axios.get(`${API_BASE_URL}/modifier_tache_complete_web/${rowData.id}`, {
        params: { ...params, nom_responsable: params.nom_responsable }
      });

      toast.success("Activité mise à jour ✅");
      setOpen(false);
      refreshRows && refreshRows();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.response?.data?.error || "Erreur lors de la modification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Modifier">
        <IconButton onClick={() => setOpen(true)} size="small" sx={{ color: '#000' }}>
          <EditSquareIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={GrowTransition}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SaveIcon sx={{ color: '#f9aa33' }} /> Modifier l'activité
        </DialogTitle>

        <DialogContent>
          <Box component="form" id="edit-form" onSubmit={submit} sx={{ pt: 1 }}>
            {FIELDS.map(f => (
              <TextField
                key={f.name}
                label={f.label}
                fullWidth
                margin="dense"
                required={f.required}
                type={f.type || "text"}
                multiline={f.multiline}
                rows={f.rows}
                disabled={loading}
                value={form[f.name]}
                onChange={handleChange(f.name)}
              />
            ))}

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Date limite"
                value={form.dateValue}
                onChange={handleDate}
                ampm={false}
                format="DD/MM/YYYY HH:00"
                slotProps={{ textField: { fullWidth: true, margin: "dense", required: true } }}
                disabled={loading}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ background: "#e8f0f6", color: "inherit" }}>
            Annuler
          </Button>
          <Button type="submit" form="edit-form" disabled={loading} sx={{ background: "#f9aa33", color: "inherit" }}>
            {loading ? "Mise à jour..." : "Modifier"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
