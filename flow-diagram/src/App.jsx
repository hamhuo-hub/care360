import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
  BaseEdge,
  getSmoothStepPath,
  NodeResizer,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function ResizableGroup({ data, selected }) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={150} minHeight={100} />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: 12 }}>
        {data.label}
      </div>
    </>
  );
}

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: data?.color }} />
      <circle r="4" fill={data?.color || '#555'}>
        <animateMotion dur={`${data?.speed || 1}s`} repeatCount="indefinite">
          <mpath href={`#${id}`} />
        </animateMotion>
      </circle>
    </>
  );
}

const nodeTypes = { resizableGroup: ResizableGroup };
const edgeTypes = { flowEdge: FlowEdge };

const initialNodes = [
  // ── 父 Group 必须排在子节点前面 ──
  {
    id: 'group-collect',
    type: 'resizableGroup',
    position: { x: -30, y: 0 },
    style: { width: 800, height: 400, backgroundColor: 'rgba(76,175,80,0.06)', border: '2px solid #4CAF50', borderRadius: 8 },
    data: { label: '采集层' },
  },
  // group-pi 嵌套在 group-collect 里
  {
    id: 'group-pi',
    type: 'resizableGroup',
    position: { x: 150, y: 15 },
    style: { width: 610, height: 350, backgroundColor: 'rgba(0,121,107,0.08)', border: '2px dashed #00796B', borderRadius: 8 },
    data: { label: '树莓派 3B — 边缘计算节点' },
    parentId: 'group-collect',
    extent: 'parent',
  },
  {
    id: 'group-aws',
    type: 'resizableGroup',
    position: { x: -30, y: 450 },
    style: { width: 780, height: 370, backgroundColor: 'rgba(33,150,243,0.06)', border: '2px solid #2196F3', borderRadius: 8 },
    data: { label: 'AWS 云端处理矩阵' },
  },
  {
    id: 'group-alert',
    type: 'resizableGroup',
    position: { x: -30, y: 830 },
    style: { width: 780, height: 160, backgroundColor: 'rgba(244,67,54,0.06)', border: '2px solid #F44336', borderRadius: 8 },
    data: { label: '社区中心' },
  },

  // ── 采集层子节点 ──
  { id: 'bracelet', data: { label: '三星 Galaxy Watch\nSensorManager 原始读数\nHEART_RATE · ACCELEROMETER\n微批 5s → JSON 打包' }, style: { background: '#388E3C', color: '#fff', border: 'none', fontSize: 11, textAlign: 'center' }, parentId: 'group-collect', extent: 'parent', position: { x: 20, y: 110 } },

  // ── 树莓派六个子模块（左列=采集，中=聚合，右列=处理/上报）──
  { id: 'pi-collect',     data: { label: '① BLE 穿戴采集\nSensorEvent 原始字节流\naccuracy / offset_ms 透传' },   style: { background: '#00796B', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-pi', extent: 'parent', position: { x: 20,  y: 60  } },
  { id: 'pi-env-collect', data: { label: '② 环境传感采集\n温湿度 / 火焰检测' },   style: { background: '#00796B', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-pi', extent: 'parent', position: { x: 20,  y: 210 } },
  { id: 'pi-clean',       data: { label: '③ Schema 标准化封包\n(清洗 / 算法已移至云端)' },    style: { background: '#00796B', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-pi', extent: 'parent', position: { x: 210, y: 130 } },
  { id: 'pi-local-alert', data: { label: '④ 本地告警\n阈值判断' }, style: { background: '#E65100', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-pi', extent: 'parent', position: { x: 410, y: 60 } },
  // pi-upload 作为 Group，内部包含缓存子节点
  { id: 'pi-upload', type: 'resizableGroup', data: { label: '⑤ 异常打包上报' }, style: { width: 160, height: 130, background: 'rgba(230,81,0,0.12)', border: '2px solid #E65100', borderRadius: 6, fontSize: 11 }, parentId: 'group-pi', extent: 'parent', position: { x: 410, y: 180 } },
  { id: 'pi-cache', data: { label: '数据缓存\nLocal Buffer' }, style: { background: '#4E342E', color: '#fff', border: 'none', fontSize: 10 }, parentId: 'pi-upload', extent: 'parent', position: { x: 15, y: 50 } },

  // ── MQTT（独立节点，连接采集层与云端）──
  { id: 'mqtt', data: { label: 'MQTT over TLS\ntelemetry/health/{device_id}\n微批 JSON · QoS 1' }, position: { x: 220, y: 415 }, style: { background: '#1565C0', color: '#fff', border: 'none', fontSize: 11, textAlign: 'center' } },

  // ── AWS 云端层（左侧垂直链：IoT Core → Rules；右侧：Lambda + DynamoDB）──
  { id: 'iot-core',  data: { label: 'AWS IoT Core\nX.509 证书认证' },   style: { background: '#1976D2', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-aws', extent: 'parent', position: { x: 80,  y: 60  } },
  { id: 'iot-rules', data: { label: 'IoT Rules Engine\nSQL 路由拦截' }, style: { background: '#1976D2', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-aws', extent: 'parent', position: { x: 80,  y: 200 } },
  { id: 'lambda',    data: { label: 'AWS Lambda\n① 精度过滤 (accuracy<2 丢弃)\n② 时序还原 (sys_ts + offset_ms)\n③ 算法分析 / 异常标记' }, style: { background: '#1976D2', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-aws', extent: 'parent', position: { x: 370, y: 180 } },
  { id: 'dynamodb',  data: { label: 'DynamoDB\n时序数据高吞吐写入' },   style: { background: '#1976D2', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-aws', extent: 'parent', position: { x: 570, y: 60  } },

  // ── 告警层 ──
  { id: 'sms',        data: { label: 'SMS 短信推送' },        style: { background: '#C62828', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-alert', extent: 'parent', position: { x: 60,  y: 60 } },
  { id: 'albany',     data: { label: '社区汇总大屏' },        style: { background: '#C62828', color: '#fff', border: 'none', fontSize: 11 }, parentId: 'group-alert', extent: 'parent', position: { x: 500, y: 60 } },
];

const initialEdges = [
  // 手环 → 树莓派穿戴采集（BLE）
  { id: 'e-bracelet-pi-collect',      source: 'bracelet',       target: 'pi-collect',     type: 'flowEdge', data: { color: '#66BB6A', speed: 1.5 } },

  // 树莓派内部流水线（橙色，慢——模拟本地处理耗时）
  { id: 'e-pi-collect-clean',         source: 'pi-collect',     target: 'pi-clean',       type: 'flowEdge', data: { color: '#FF9800', speed: 2   } },
  { id: 'e-pi-env-collect-clean',     source: 'pi-env-collect', target: 'pi-clean',       type: 'flowEdge', data: { color: '#FF9800', speed: 2   } },
  { id: 'e-pi-clean-alert',           source: 'pi-clean',       target: 'pi-local-alert', type: 'flowEdge', data: { color: '#FF5722', speed: 1.8 } },
  { id: 'e-pi-alert-upload',          source: 'pi-local-alert', target: 'pi-upload',      type: 'flowEdge', data: { color: '#FF5722', speed: 1.2 } },

  // 树莓派 → MQTT 上云（绿色，中速）
  { id: 'e-pi-upload-mqtt',       source: 'pi-upload',      target: 'mqtt',           type: 'flowEdge', data: { color: '#4CAF50', speed: 1 } },

  // 云端主路径（蓝色，快——云端高速处理）
  { id: 'e-mqtt-iot-core',        source: 'mqtt',           target: 'iot-core',       type: 'flowEdge', data: { color: '#42A5F5', speed: 0.6 } },
  { id: 'e-iot-core-rules',       source: 'iot-core',       target: 'iot-rules',      type: 'flowEdge', data: { color: '#42A5F5', speed: 0.6 } },
  { id: 'e-rules-lambda',         source: 'iot-rules',      target: 'lambda',         type: 'flowEdge', data: { color: '#42A5F5', speed: 0.6 } },
  { id: 'e-lambda-dynamodb',      source: 'lambda',         target: 'dynamodb',       type: 'flowEdge', data: { color: '#42A5F5', speed: 0.6 }, pathOptions: { offset: 20 } },
  { id: 'e-dynamodb-lambda',      source: 'dynamodb',       target: 'lambda',         type: 'flowEdge', data: { color: '#9C27B0', speed: 1.2 }, pathOptions: { offset: -20 } },

  // 告警触发（红色，最快——紧急通知）
  { id: 'e-lambda-sms',           source: 'lambda',         target: 'sms',            type: 'flowEdge', data: { color: '#EF5350', speed: 0.4 } },
  { id: 'e-lambda-albany',        source: 'lambda',         target: 'albany',         type: 'flowEdge', data: { color: '#EF5350', speed: 0.4 } },
];

function FlowCanvas({ nodes, edges, setNodes, onNodesChange, onEdgesChange, onConnect, handleReset }) {
  const { screenToFlowPosition } = useReactFlow();

  const onDoubleClick = useCallback((event) => {
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode = {
      id: `node-${Date.now()}`,
      position,
      data: { label: '新节点' },
    };
    setNodes((nds) => {
      const updated = [...nds, newNode];
      localStorage.setItem('flow-nodes', JSON.stringify(updated));
      return updated;
    });
  }, [screenToFlowPosition, setNodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDoubleClick={onDoubleClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      <Background variant="dots" gap={12} size={1} />
      <Controls />
      <Panel position="top-right">
        <button onClick={handleReset} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
          重置布局
        </button>
      </Panel>
    </ReactFlow>
  );
}

export default function App() {
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('flow-nodes');
    return saved ? JSON.parse(saved) : initialNodes;
  });

  const [edges, setEdges] = useState(() => {
    const saved = localStorage.getItem('flow-edges');
    return saved ? JSON.parse(saved) : initialEdges;
  });

  const onConnect = useCallback((connection) => {
    setEdges((eds) => {
      const updated = addEdge(connection, eds);
      localStorage.setItem('flow-edges', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      localStorage.setItem('flow-nodes', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      localStorage.setItem('flow-edges', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem('flow-nodes');
    localStorage.removeItem('flow-edges');
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          handleReset={handleReset}
        />
      </ReactFlowProvider>
    </div>
  );
}
